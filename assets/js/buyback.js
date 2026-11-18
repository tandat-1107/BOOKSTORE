
const Buyback = {
    storageKey: "bookstore_buyback_requests",

    getRequests() {
        const data = BookStore.get(this.storageKey, []);
        return Array.isArray(data) ? data : [];
    },

    saveRequests(requests) {
        BookStore.save(this.storageKey, requests);
    },

    currentUser() {
        return BookStore.user();
    },

    notify(message, type = "success") {
        BookStore.notify(message, type);
    },

    statusLabel(status) {
        const labels = {
            pending: "Chờ duyệt",
            quoted: "Đã báo giá",
            accepted: "Khách đã đồng ý",
            rejected: "Đã từ chối",
            declined: "Khách từ chối giá",
            completed: "Đã thu mua"
        };

        return labels[status] || status;
    },

    statusClass(status) {
        const classes = {
            pending: "status-pending",
            quoted: "status-shipping",
            accepted: "status-shipping",
            rejected: "status-cancelled",
            declined: "status-cancelled",
            completed: "status-completed"
        };

        return classes[status] || "status-pending";
    },

    async imageToDataURL(file) {
        if (!file) return "";

        if (!file.type.startsWith("image/")) {
            throw new Error("Vui lòng chọn file ảnh.");
        }

        if (file.size > 1024 * 1024) {
            throw new Error("Ảnh phải nhỏ hơn 1MB.");
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(
                new Error("Không đọc được ảnh.")
            );

            reader.readAsDataURL(file);
        });
    },

    async submitRequest(event) {
        event.preventDefault();

        const user = this.currentUser();

        if (!user) {
            location.href = BookStore.url("pages/login.html");
            return;
        }

        if (user.role === "admin") {
            this.notify(
                "Vui lòng sử dụng tài khoản khách hàng.",
                "error"
            );
            return;
        }

        const title = $("#sell-title").val().trim();
        const author = $("#sell-author").val().trim();
        const category = $("#sell-category").val();
        const condition = $("#sell-condition").val();
        const expectedPrice = Number($("#sell-price").val());
        const description = $("#sell-description").val().trim();
        const file = $("#sell-image")[0].files[0];

        if (
            title.length < 2 ||
            author.length < 2 ||
            !category ||
            !condition ||
            !Number.isFinite(expectedPrice) ||
            expectedPrice <= 0
        ) {
            this.notify("Thông tin sách chưa hợp lệ!", "error");
            return;
        }

        try {
            const image = await this.imageToDataURL(file);

            const request = {
                id: Date.now(),
                userId: user.id,
                customer: user.name,
                email: user.email,
                title,
                author,
                category,
                condition,
                expectedPrice,
                description,
                image,
                offeredPrice: null,
                status: "pending",
                date: new Date().toLocaleString("vi-VN"),
                completedAt: null,
                inventoryAdded: false
            };

            const requests = this.getRequests();
            requests.push(request);

            try {
                this.saveRequests(requests);
            } catch {
                this.notify(
                    "Không đủ dung lượng lưu ảnh. Hãy chọn ảnh nhỏ hơn.",
                    "error"
                );
                return;
            }

            alert("Đã gửi yêu cầu thu mua sách thành công!");

            location.href = BookStore.url(
                "pages/my-sell-requests.html"
            );
        } catch (error) {
            this.notify(error.message, "error");
        }
    },

    renderMyRequests() {
        const user = this.currentUser();
        if (!user) return;

        const requests = this.getRequests()
            .filter(r => String(r.userId) === String(user.id))
            .reverse();

        if (!requests.length) {
            $("#my-sell-requests").html(`
                <div class="empty-state">
                    <i class="bi bi-journal-x"></i>
                    <h4>Chưa có yêu cầu thu mua</h4>
                    <p>Bạn có sách cũ muốn bán cho BOOKSTORE?</p>
                    <a href="${BookStore.url("pages/sell-book.html")}"
                       class="btn btn-primary">
                        Gửi yêu cầu ngay
                    </a>
                </div>
            `);
            return;
        }

        $("#my-sell-requests").html(
            requests.map(r => this.requestCard(r, false)).join("")
        );
    },

    requestCard(r, isAdmin) {
        const e = BookStore.escape;

        const image = r.image
            ? `<img src="${r.image}" alt="Ảnh sách"
                    style="width:100px;height:135px;object-fit:contain;
                    border-radius:10px;background:#f1f5f9">`
            : `<div class="feature-icon">
                    <i class="bi bi-book"></i>
               </div>`;

        let actions = "";

        if (!isAdmin && r.status === "quoted") {
            actions = `
                <div class="d-flex gap-2 mt-3">
                    <button class="btn btn-success btn-sm"
                        onclick="Buyback.customerDecision(${r.id}, true)">
                        Đồng ý giá
                    </button>
                    <button class="btn btn-outline-danger btn-sm"
                        onclick="Buyback.customerDecision(${r.id}, false)">
                        Từ chối giá
                    </button>
                </div>
            `;
        }

        if (isAdmin && r.status === "pending") {
            actions = `
                <div class="d-flex gap-2 mt-3 flex-wrap">
                    <input id="quote-${r.id}" type="number" min="1"
                        class="form-control" style="max-width:180px"
                        placeholder="Giá thu mua (đ)">
                    <button class="btn btn-primary btn-sm"
                        onclick="Buyback.quote(${r.id})">
                        Gửi báo giá
                    </button>
                    <button class="btn btn-outline-danger btn-sm"
                        onclick="Buyback.reject(${r.id})">
                        Từ chối thu mua
                    </button>
                </div>
            `;
        }

        if (isAdmin && r.status === "accepted") {
            actions = `
                <button class="btn btn-success btn-sm mt-3"
                    onclick="Buyback.complete(${r.id})">
                    Xác nhận đã nhận sách và thu mua
                </button>
            `;
        }

        if (isAdmin && r.status === "completed" && !r.inventoryAdded) {
            actions = `
                <button class="btn btn-primary btn-sm mt-3"
                    onclick="Buyback.addToInventory(${r.id})">
                    Đưa sách vào kho bán lại
                </button>
            `;
        }

        return `
            <div class="cart-panel mb-4">
                <div class="d-flex gap-3 flex-wrap">
                    ${image}

                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between
                                    align-items-start flex-wrap gap-2">
                            <h5 class="fw-bold mb-1">${e(r.title)}</h5>
                            <span class="status-badge
                                ${this.statusClass(r.status)}">
                                ${this.statusLabel(r.status)}
                            </span>
                        </div>

                        <p class="text-muted small mb-2">
                            Mã yêu cầu: #${r.id} · ${e(r.date)}
                        </p>

                        ${isAdmin ? `
                            <p class="mb-2">
                                Khách: ${e(r.customer)} (${e(r.email)})
                            </p>
                        ` : ""}

                        <p class="mb-2">Tác giả: ${e(r.author)}</p>
                        <p class="mb-2">Thể loại: ${e(r.category)}</p>
                        <p class="mb-2">Tình trạng: ${e(r.condition)}</p>

                        <p class="mb-2">
                            Giá mong muốn:
                            <strong>${BookStore.money(r.expectedPrice)}</strong>
                        </p>

                        ${r.offeredPrice !== null ? `
                            <p class="mb-2">
                                Giá cửa hàng đề xuất:
                                <strong class="text-primary">
                                    ${BookStore.money(r.offeredPrice)}
                                </strong>
                            </p>
                        ` : ""}

                        ${r.description ? `
                            <p class="text-muted">
                                ${e(r.description)}
                            </p>
                        ` : ""}

                        ${actions}
                    </div>
                </div>
            </div>
        `;
    },

    renderAdminRequests() {
        const requests = this.getRequests().reverse();

        $("#admin-buyback-list").html(
            requests.length
                ? requests.map(r => this.requestCard(r, true)).join("")
                : `<div class="empty-state">
                    <h4>Chưa có yêu cầu thu mua</h4>
                   </div>`
        );

        $("#buyback-count").text(requests.length);
        $("#buyback-pending").text(
            requests.filter(r => r.status === "pending").length
        );
        $("#buyback-completed").text(
            requests.filter(r => r.status === "completed").length
        );
    },

    updateRequest(id, allowedStatus, updater) {
        const requests = this.getRequests();
        const request = requests.find(r => r.id === id);

        if (!request || request.status !== allowedStatus) {
            this.notify("Trạng thái yêu cầu không hợp lệ!", "error");
            return false;
        }

        updater(request);
        this.saveRequests(requests);
        return true;
    },

    quote(id) {
        if (this.currentUser()?.role !== "admin") return;

        const price = Number($(`#quote-${id}`).val());

        if (!Number.isFinite(price) || price <= 0) {
            this.notify("Vui lòng nhập giá thu mua hợp lệ!", "error");
            return;
        }

        if (this.updateRequest(id, "pending", r => {
            r.offeredPrice = price;
            r.status = "quoted";
        })) {
            this.renderAdminRequests();
            this.notify("Đã gửi báo giá!");
        }
    },

    reject(id) {
        if (this.currentUser()?.role !== "admin") return;
        if (!confirm("Từ chối yêu cầu thu mua này?")) return;

        if (this.updateRequest(id, "pending", r => {
            r.status = "rejected";
        })) {
            this.renderAdminRequests();
        }
    },

    customerDecision(id, accepted) {
        const user = this.currentUser();
        const requests = this.getRequests();
        const request = requests.find(r => r.id === id);

        if (!user || !request ||
            String(request.userId) !== String(user.id) ||
            request.status !== "quoted") {
            this.notify("Không thể xử lý yêu cầu!", "error");
            return;
        }

        request.status = accepted ? "accepted" : "declined";
        this.saveRequests(requests);
        this.renderMyRequests();

        this.notify(
            accepted ? "Bạn đã đồng ý mức giá!" : "Bạn đã từ chối mức giá."
        );
    },

    complete(id) {
        if (this.currentUser()?.role !== "admin") return;

        if (!confirm("Xác nhận đã nhận sách và hoàn tất thu mua?")) {
            return;
        }

        if (this.updateRequest(id, "accepted", r => {
            r.status = "completed";
            r.completedAt = new Date().toLocaleString("vi-VN");
        })) {
            this.renderAdminRequests();
            this.notify("Thu mua thành công!");
        }
    },

    addToInventory(id) {
        if (this.currentUser()?.role !== "admin") return;

        const requests = this.getRequests();
        const request = requests.find(r => r.id === id);

        if (!request ||
            request.status !== "completed" ||
            request.inventoryAdded) {
            this.notify("Không thể nhập kho yêu cầu này!", "error");
            return;
        }

        const books = BookStore.books;
        const nextId = Math.max(
            0,
            ...books.map(b => Number(b.id) || 0)
        ) + 1;

        books.push({
            id: nextId,
            title: request.title + " (Sách cũ)",
            author: request.author,
            category: request.category,
            price: Math.ceil(request.offeredPrice * 1.3 / 1000) * 1000,
            originalPrice: Math.ceil(
                request.offeredPrice * 1.5 / 1000
            ) * 1000,
            stock: 1,
            rating: 0,
            image: request.image,
            description:
                "Sách cũ đã thu mua. Tình trạng: " +
                request.condition + ". " +
                request.description
        });

        request.inventoryAdded = true;
        request.inventoryBookId = nextId;

        try {
            BookStore.save("books", books);
            this.saveRequests(requests);
            this.renderAdminRequests();
            this.notify("Đã thêm sách vào kho bán lại!");
        } catch {
            this.notify("Không đủ dung lượng lưu dữ liệu!", "error");
        }
    }
};

$(async function () {
    await BookStore.ready;

    if ($("#sell-book-form").length) {
        if (!BookStore.requireLogin()) return;

        $("#sell-book-form").on("submit", event => {
            Buyback.submitRequest(event);
        });
    }

    if ($("#my-sell-requests").length) {
        if (!BookStore.requireLogin()) return;
        Buyback.renderMyRequests();
    }

    if ($("#admin-buyback-list").length) {
        if (!BookStore.requireAdmin()) return;
        Buyback.renderAdminRequests();
    }
});
