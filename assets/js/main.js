
const BookStore = {
    books: [],
    ready: null,

    // ==========================================
    // 1. ĐƯỜNG DẪN WEBSITE
    // ==========================================

    base: location.hostname.endsWith("github.io")
        ? "/BOOKSTORE"
        : "",

    url(path) {
        const value = String(path || "").replace(/^\/+/, "");
        return this.base + "/" + value;
    },

    // ==========================================
    // 2. LOCAL STORAGE
    // ==========================================

    get(key, fallback = []) {
        try {
            const raw = localStorage.getItem(key);

            if (raw === null) {
                return fallback;
            }

            return JSON.parse(raw);
        } catch (error) {
            console.error("Lỗi đọc localStorage:", error);
            return fallback;
        }
    },

    save(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },

    // ==========================================
    // 3. HÀM DÙNG CHUNG
    // ==========================================

    money(value) {
        return Number(value || 0).toLocaleString("vi-VN") + "đ";
    },

    escape(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[char]));
    },

    // ==========================================
    // 4. XỬ LÝ ẢNH SÁCH
    // ==========================================

    image(book) {
        const src = String(book.image || "").trim();

        // Ảnh khách tải lên khi bán sách cũ
        if (src.startsWith("data:image/")) {
            return src;
        }

        // Ảnh từ Internet
        if (/^https?:\/\//i.test(src) &&
            !src.includes("placehold.co")) {
            return src;
        }

        // 12 ảnh sách mẫu
        const imageMap = {
            1: "dac-nhan-tam.jpg",
            2: "nha-gia-kim.jpg",
            3: "hoa-vang.jpg",
            4: "atomic-habits.jpg",
            5: "mat-biec.jpg",
            6: "tuoi-tre.jpg",
            7: "tu-duy.jpg",
            8: "de-men.jpg",
            9: "khong-gia-dinh.jpg",
            10: "sapiens.jpg",
            11: "di-tim-le-song.jpg",
            12: "luoc-su-thoi-gian.jpg"
        };

        const filename = imageMap[Number(book.id)];

        if (filename) {
            return this.url("assets/images/" + filename);
        }

        if (!src) {
            return this.url("assets/images/dac-nhan-tam.jpg");
        }

        return this.url(
            "assets/images/" + src.split("/").pop()
        );
    },

    // ==========================================
    // 5. TÀI KHOẢN
    // ==========================================

    user() {
        return this.get("currentUser", null);
    },

    logout() {
        localStorage.removeItem("currentUser");
        location.href = this.url("index.html");
    },

    requireLogin() {
        if (!this.user()) {
            location.href = this.url("pages/login.html");
            return false;
        }

        return true;
    },

    requireAdmin() {
        if (this.user()?.role !== "admin") {
            location.href = this.url("pages/login.html");
            return false;
        }

        return true;
    },

    // ==========================================
    // 6. GIỎ HÀNG
    // ==========================================

    cartKey() {
        const user = this.user();
        return "cart_" + (user?.id ?? "guest");
    },

    cart() {
        const data = this.get(this.cartKey(), []);
        return Array.isArray(data) ? data : [];
    },

    orders() {
        const data = this.get("orders", []);
        return Array.isArray(data) ? data : [];
    },

    updateCartCount() {
        const count = this.cart().reduce(
            (total, item) =>
                total + Number(item.quantity || 0),
            0
        );

        document.querySelectorAll("#cart-count").forEach(element => {
            element.textContent = count;
        });
    },

    addToCart(id, quantity = 1) {
        const book = this.books.find(
            item => Number(item.id) === Number(id)
        );

        quantity = Number(quantity);

        if (
            !book ||
            !Number.isInteger(quantity) ||
            quantity < 1
        ) {
            this.notify("Sản phẩm không hợp lệ!", "error");
            return false;
        }

        const cart = this.cart();

        const existing = cart.find(
            item => Number(item.id) === Number(id)
        );

        const currentQuantity = Number(
            existing?.quantity || 0
        );

        const stock = Number(book.stock || 0);

        if (currentQuantity + quantity > stock) {
            this.notify("Không đủ số lượng trong kho!", "error");
            return false;
        }

        if (existing) {
            existing.quantity = currentQuantity + quantity;
        } else {
            cart.push({
                id: Number(id),
                quantity
            });
        }

        this.save(this.cartKey(), cart);
        this.updateCartCount();

        window.dispatchEvent(new Event("cartUpdated"));

        this.notify("Đã thêm sách vào giỏ hàng!");

        return true;
    },

    // ==========================================
    // 7. THÔNG BÁO
    // ==========================================

    notify(message, type = "success") {
        if (typeof bootstrap === "undefined") {
            alert(message);
            return;
        }

        let container = document.getElementById("toast-area");

        if (!container) {
            container = document.createElement("div");

            container.id = "toast-area";
            container.className =
                "toast-container position-fixed top-0 end-0 p-3";

            document.body.appendChild(container);
        }

        const color = type === "success"
            ? "success"
            : "danger";

        const element = document.createElement("div");

        element.className = `toast text-bg-${color} border-0`;

        element.innerHTML = `
            <div class="d-flex">
                <div class="toast-body"></div>

                <button
                    type="button"
                    class="btn-close btn-close-white me-2 m-auto"
                    data-bs-dismiss="toast"
                    aria-label="Đóng">
                </button>
            </div>
        `;

        element.querySelector(".toast-body").textContent = message;

        container.appendChild(element);

        element.addEventListener("hidden.bs.toast", () => {
            element.remove();
        });

        new bootstrap.Toast(element, {
            delay: 2500
        }).show();
    },

    // ==========================================
    // 8. TẢI DANH SÁCH SÁCH
    // ==========================================

    async loadBooks() {
        try {
            const response = await fetch(
                this.url("data/books.json")
            );

            if (!response.ok) {
                throw new Error(
                    "Không tải được books.json: " + response.status
                );
            }

            const data = await response.json();

            const defaults = Array.isArray(data)
                ? data
                : data.books;

            if (!Array.isArray(defaults)) {
                throw new Error("Dữ liệu books.json không hợp lệ");
            }

            const saved = this.get("books", null);

            if (Array.isArray(saved)) {
                // Giữ sách Admin đã chỉnh sửa và sách thu mua.
                // Bổ sung các sách mẫu còn thiếu.
                const merged = [...saved];

                defaults.forEach(book => {
                    const exists = merged.some(
                        item =>
                            Number(item.id) === Number(book.id)
                    );

                    if (!exists) {
                        merged.push(book);
                    }
                });

                this.books = merged;
            } else {
                this.books = defaults;
            }

            this.save("books", this.books);

            console.log(
                "BOOKSTORE đã tải:",
                this.books.length,
                "cuốn sách"
            );

        } catch (error) {
            console.error("Lỗi tải sách:", error);

            const saved = this.get("books", []);
            this.books = Array.isArray(saved) ? saved : [];
        }
    },

    // ==========================================
    // 9. HEADER VÀ FOOTER
    // ==========================================

    async loadLayout() {
        const loadComponent = async (selector, path) => {
            const element = document.querySelector(selector);

            if (!element) return;

            try {
                const response = await fetch(this.url(path));

                if (!response.ok) {
                    throw new Error(
                        "Không tải được " + path
                    );
                }

                element.innerHTML = await response.text();

            } catch (error) {
                console.error("Lỗi tải giao diện:", error);
            }
        };

        await Promise.all([
            loadComponent("#header", "components/header.html"),
            loadComponent("#footer", "components/footer.html")
        ]);

        // Chuẩn hóa đường dẫn GitHub Pages
        document.querySelectorAll(
            "#header a[href^='/'], #footer a[href^='/']"
        ).forEach(link => {
            const href = link.getAttribute("href");

            if (
                this.base &&
                href.startsWith(this.base + "/")
            ) {
                return;
            }

            link.setAttribute("href", this.base + href);
        });

        this.renderAccountMenu();
        this.updateCartCount();
        this.setupSearch();
    },

    // ==========================================
    // 10. MENU ĐĂNG NHẬP / ĐĂNG KÝ
    // ==========================================

    renderAccountMenu() {
        const menu = document.getElementById("account-menu");

        if (!menu) return;

        const user = this.user();

        if (!user) {
            menu.innerHTML = `
                <div class="d-flex align-items-center gap-2">

                    <a
                        href="${this.url("pages/login.html")}"
                        class="btn btn-outline-primary btn-sm">
                        <i class="bi bi-box-arrow-in-right"></i>
                        Đăng nhập
                    </a>

                    <a
                        href="${this.url("pages/register.html")}"
                        class="btn btn-primary btn-sm">
                        <i class="bi bi-person-plus"></i>
                        Đăng ký
                    </a>

                </div>
            `;
        } else {
            const destination = user.role === "admin"
                ? "admin/dashboard.html"
                : "pages/orders.html";

            menu.innerHTML = `
                <div class="dropdown">

                    <button
                        class="btn btn-light dropdown-toggle"
                        data-bs-toggle="dropdown">
                        <i class="bi bi-person-circle"></i>
                        ${this.escape(user.name || "Tài khoản")}
                    </button>

                    <ul class="dropdown-menu dropdown-menu-end">

                        <li>
                            <a
                                class="dropdown-item"
                                href="${this.url(destination)}">
                                ${user.role === "admin"
                                    ? "Quản trị"
                                    : "Đơn hàng của tôi"}
                            </a>
                        </li>

                        <li>
                            <hr class="dropdown-divider">
                        </li>

                        <li>
                            <button
                                class="dropdown-item text-danger"
                                onclick="BookStore.logout()">
                                <i class="bi bi-box-arrow-right"></i>
                                Đăng xuất
                            </button>
                        </li>

                    </ul>
                </div>
            `;
        }

        // Menu đơn hàng
        const ordersNav = document.getElementById("orders-nav");

        if (ordersNav) {
            ordersNav.style.display =
                user && user.role !== "admin"
                    ? ""
                    : "none";
        }

        // Menu yêu cầu thu mua
        const sellRequestsNav = document.getElementById(
            "sell-requests-nav"
        );

        if (sellRequestsNav) {
            sellRequestsNav.style.display =
                user && user.role !== "admin"
                    ? ""
                    : "none";
        }
    },

    // ==========================================
    // 11. TÌM KIẾM TRÊN HEADER
    // ==========================================

    setupSearch() {
        const form = document.getElementById(
            "header-search-form"
        );

        if (!form) return;

        form.addEventListener("submit", event => {
            event.preventDefault();

            const input = document.getElementById(
                "header-keyword"
            );

            const keyword = input?.value.trim() || "";

            location.href = this.url(
                "pages/books.html?q=" +
                encodeURIComponent(keyword)
            );
        });
    },

    // ==========================================
    // 12. KHỞI ĐỘNG
    // ==========================================

    async init() {
        await this.loadBooks();
        await this.loadLayout();
    }
};

// CHỈ KHỞI TẠO MỘT LẦN
BookStore.ready = BookStore.init();
