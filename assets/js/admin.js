
const Admin = {
    statuses: [
        "Chờ xác nhận",
        "Đang giao",
        "Hoàn thành",
        "Đã hủy"
    ],

    sidebar(active) {
        return `
            <aside class="admin-sidebar">
                <div>
                    <h6>QUẢN LÝ CỬA HÀNG</h6>
                    <a href="/admin/dashboard.html"
                        class="${active === "dashboard" ? "active" : ""}">
                        <i class="bi bi-grid"></i> Tổng quan
                    </a>
                    <a href="/admin/products.html"
                        class="${active === "products" ? "active" : ""}">
                        <i class="bi bi-book"></i> Quản lý sách
                    </a>
                    <a href="/admin/orders.html"
                        class="${active === "orders" ? "active" : ""}">
                        <i class="bi bi-receipt"></i> Đơn hàng
                    </a>
                    <a href="/index.html">
                        <i class="bi bi-house"></i> Về trang chủ
                    </a>
                </div>
            </aside>
        `;
    },

    init() {
        if (!BookStore.requireAdmin()) return;

        const page = $("main").data("page");
        $("#admin-sidebar").html(this.sidebar(page));

        if (page === "dashboard") this.dashboard();
        if (page === "products") this.products();
        if (page === "orders") this.orders();
    },

    dashboard() {
        const books = BookStore.books;
        const orders = BookStore.orders();

        const revenue = orders
            .filter(o => o.status === "Hoàn thành")
            .reduce((sum, o) => sum + o.total, 0);

        $("#stat-books").text(books.length);
        $("#stat-orders").text(orders.length);
        $("#stat-customers").text(BookStore.get("users", []).length);
        $("#stat-revenue").text(BookStore.money(revenue));

        const recent = orders.slice(-5).reverse();

        $("#recent-orders").html(recent.map(order => `
            <tr>
                <td>#${order.id}</td>
                <td>${BookStore.escape(order.customer)}</td>
                <td>${BookStore.money(order.total)}</td>
                <td>${BookStore.escape(order.status)}</td>
            </tr>
        `).join("") || `
            <tr><td colspan="4" class="text-center">
                Chưa có đơn hàng
            </td></tr>
        `);

        const counts = this.statuses.map(status =>
            orders.filter(o => o.status === status).length
        );

        if (typeof Chart !== "undefined" &&
            document.getElementById("orders-chart")) {
            new Chart(document.getElementById("orders-chart"), {
                type: "doughnut",
                data: {
                    labels: this.statuses,
                    datasets: [{
                        data: counts,
                        backgroundColor: [
                            "#f59e0b", "#2563eb", "#16a34a", "#ef4444"
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: "bottom" }
                    }
                }
            });
        }
    },

    products() {
        this.renderProducts();

        $("#product-form").on("submit", event => {
            event.preventDefault();
            this.saveProduct();
        });

        $("#reset-product").on("click", () => {
            $("#product-form")[0].reset();
            $("#product-id").val("");
            $("#product-modal-title").text("Thêm sách mới");
        });
    },

    renderProducts() {
        const keyword = ($("#admin-search").val() || "")
            .toLocaleLowerCase("vi-VN");

        const books = BookStore.books.filter(b =>
            b.title.toLocaleLowerCase("vi-VN").includes(keyword)
        );

        $("#admin-products").html(books.map(book => `
            <tr>
                <td>#${book.id}</td>
                <td>
                    <div class="d-flex align-items-center gap-3">
                        <img src="${BookStore.escape(book.image)}"
                            class="table-book-image"
                            alt="${BookStore.escape(book.title)}">
                        <div>
                            <strong>${BookStore.escape(book.title)}</strong>
                            <div class="text-muted small">
                                ${BookStore.escape(book.author)}
                            </div>
                        </div>
                    </div>
                </td>
                <td>${BookStore.escape(book.category)}</td>
                <td>${BookStore.money(book.price)}</td>
                <td>${book.stock}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary"
                        onclick="Admin.editProduct(${book.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger"
                        onclick="Admin.deleteProduct(${book.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join("") || `
            <tr><td colspan="6" class="text-center">
                Không có sản phẩm
            </td></tr>
        `);
    },

    editProduct(id) {
        const book = BookStore.books.find(b => b.id === id);
        if (!book) return;

        $("#product-id").val(book.id);
        $("#product-title").val(book.title);
        $("#product-author").val(book.author);
        $("#product-category").val(book.category);
        $("#product-price").val(book.price);
        $("#product-original-price").val(book.originalPrice);
        $("#product-stock").val(book.stock);
        $("#product-rating").val(book.rating);
        $("#product-image").val(book.image);
        $("#product-description").val(book.description);

        $("#product-modal-title").text("Chỉnh sửa sách");

        bootstrap.Modal.getOrCreateInstance(
            document.getElementById("productModal")
        ).show();
    },

    saveProduct() {
        const id = Number($("#product-id").val());

        const data = {
            title: $("#product-title").val().trim(),
            author: $("#product-author").val().trim(),
            category: $("#product-category").val().trim(),
            price: Number($("#product-price").val()),
            originalPrice: Number($("#product-original-price").val()),
            stock: Number($("#product-stock").val()),
            rating: Number($("#product-rating").val()),
            image: $("#product-image").val().trim(),
            description: $("#product-description").val().trim()
        };

        if (!data.title || !data.author || !data.category ||
            !data.image || !Number.isFinite(data.price) ||
            data.price <= 0 || data.originalPrice < data.price ||
            !Number.isInteger(data.stock) || data.stock < 0 ||
            !Number.isFinite(data.rating) ||
            data.rating < 0 || data.rating > 5) {
            BookStore.notify("Thông tin sách không hợp lệ!", "error");
            return;
        }

        if (id) {
            const index = BookStore.books.findIndex(b => b.id === id);
            if (index < 0) return;

            BookStore.books[index] = {
                ...BookStore.books[index],
                ...data
            };
        } else {
            BookStore.books.push({
                id: Math.max(0, ...BookStore.books.map(b => b.id)) + 1,
                ...data
            });
        }

        BookStore.save("books", BookStore.books);
        this.renderProducts();

        bootstrap.Modal.getInstance(
            document.getElementById("productModal")
        ).hide();

        BookStore.notify("Đã lưu sản phẩm!");
    },

    deleteProduct(id) {
        if (!confirm("Bạn chắc chắn muốn xóa sách này?")) return;

        BookStore.books = BookStore.books.filter(b => b.id !== id);
        BookStore.save("books", BookStore.books);

        this.renderProducts();
        BookStore.notify("Đã xóa sách!");
    },

    orders() {
        this.renderOrders();
    },

    renderOrders() {
        const orders = BookStore.orders().slice().reverse();

        $("#admin-orders").html(orders.map(order => {
            const statusClass = {
                "Chờ xác nhận": "status-pending",
                "Đang giao": "status-shipping",
                "Hoàn thành": "status-completed",
                "Đã hủy": "status-cancelled"
            }[order.status] || "status-pending";

            const terminal = ["Hoàn thành", "Đã hủy"]
                .includes(order.status);

            return `
                <tr>
                    <td><strong>#${order.id}</strong></td>
                    <td>
                        ${BookStore.escape(order.customer)}
                        <div class="text-muted small">
                            ${BookStore.escape(order.phone)}
                        </div>
                    </td>
                    <td>${BookStore.escape(order.date)}</td>
                    <td>${BookStore.money(order.total)}</td>
                    <td>
                        <span class="status-badge ${statusClass}">
                            ${BookStore.escape(order.status)}
                        </span>
                    </td>
                    <td>
                        <select class="form-select form-select-sm"
                            ${terminal ? "disabled" : ""}
                            onchange="Admin.changeStatus(${order.id}, this.value)">
                            ${this.statuses.map(status => `
                                <option value="${status}"
                                    ${status === order.status ? "selected" : ""}>
                                    ${status}
                                </option>
                            `).join("")}
                        </select>
                    </td>
                </tr>
            `;
        }).join("") || `
            <tr><td colspan="6" class="text-center">
                Chưa có đơn hàng
            </td></tr>
        `);
    },

    changeStatus(id, status) {
        const orders = BookStore.orders();
        const order = orders.find(o => o.id === id);

        if (!order || !this.statuses.includes(status)) return;

        if (["Hoàn thành", "Đã hủy"].includes(order.status)) {
            this.renderOrders();
            return;
        }

        if (status === "Đã hủy") {
            order.items.forEach(item => {
                const book = BookStore.books.find(b => b.id === item.id);
                if (book) book.stock += item.quantity;
            });

            BookStore.save("books", BookStore.books);
        }

        order.status = status;
        BookStore.save("orders", orders);

        this.renderOrders();
        BookStore.notify("Đã cập nhật trạng thái đơn hàng!");
    }
};

$(async function() {
    await BookStore.ready;
    Admin.init();

    $("#admin-search").on("input", () => Admin.renderProducts());
});
