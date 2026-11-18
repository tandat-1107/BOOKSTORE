
const BookStore = {
    books: [],
    ready: null,

    // Xác định đường dẫn gốc của website
    base: location.hostname.endsWith("github.io")
        ? "/BOOKSTORE"
        : "",

    url(path) {
        return this.base + "/" + String(path).replace(/^\/+/, "");
    },

    get(key, fallback = []) {
        try {
            const value = localStorage.getItem(key);
            return value === null ? fallback : JSON.parse(value);
        } catch {
            return fallback;
        }
    },

    save(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },

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

    user() {
        return this.get("currentUser", null);
    },

    cartKey() {
        return "cart_" + (this.user()?.id ?? "guest");
    },

    cart() {
        return this.get(this.cartKey(), []);
    },

    orders() {
        return this.get("orders", []);
    },

    async init() {
        try {
            const response = await fetch(this.url("data/books.json"));

            if (!response.ok) {
                throw new Error("Không tải được books.json");
            }

            const defaults = await response.json();
            const saved = this.get("books", null);

            this.books = Array.isArray(saved)
                ? saved
                : defaults;

            if (!Array.isArray(saved)) {
                this.save("books", defaults);
            }

        } catch (error) {
            console.error("Lỗi tải sách:", error);
            this.books = this.get("books", []);
        }

        await this.loadLayout();
    },

    async loadLayout() {
        const loadComponent = async (selector, path) => {
            const element = document.querySelector(selector);
            if (!element) return;

            try {
                const response = await fetch(this.url(path));

                if (!response.ok) {
                    throw new Error("Không tải được " + path);
                }

                element.innerHTML = await response.text();

            } catch (error) {
                console.error(error);
            }
        };

        await Promise.all([
            loadComponent("#header", "components/header.html"),
            loadComponent("#footer", "components/footer.html")
        ]);

        // Chuẩn hóa đường dẫn các liên kết
        document.querySelectorAll(
            "#header a[href^='/'], #footer a[href^='/']"
        ).forEach(link => {
            const href = link.getAttribute("href");
            link.setAttribute("href", this.base + href);
        });

        this.renderAccountMenu();

        const searchForm = document.getElementById("header-search-form");

        if (searchForm) {
            searchForm.addEventListener("submit", event => {
                event.preventDefault();

                const keyword = document
                    .getElementById("header-keyword")
                    .value.trim();

                location.href = this.url(
                    "pages/books.html?q=" +
                    encodeURIComponent(keyword)
                );
            });
        }

        this.updateCartCount();
    },

    renderAccountMenu() {
        const menu = document.getElementById("account-menu");
        if (!menu) return;

        const user = this.user();

        if (!user) {
            menu.innerHTML = `
                <div class="d-flex align-items-center gap-2">
                    <a href="${this.url("pages/login.html")}"
                        class="btn btn-outline-primary btn-sm">
                        <i class="bi bi-box-arrow-in-right"></i>
                        Đăng nhập
                    </a>

                    <a href="${this.url("pages/register.html")}"
                        class="btn btn-primary btn-sm">
                        <i class="bi bi-person-plus"></i>
                        Đăng ký
                    </a>
                </div>
            `;
        } else {
            menu.innerHTML = `
                <div class="dropdown">
                    <button class="btn btn-light dropdown-toggle"
                        data-bs-toggle="dropdown">
                        <i class="bi bi-person-circle"></i>
                        ${this.escape(user.name)}
                    </button>

                    <ul class="dropdown-menu dropdown-menu-end">
                        ${
                            user.role === "admin"
                                ? `
                                <li>
                                    <a class="dropdown-item"
                                        href="${this.url("admin/dashboard.html")}">
                                        <i class="bi bi-speedometer2"></i>
                                        Quản trị
                                    </a>
                                </li>
                                `
                                : `
                                <li>
                                    <a class="dropdown-item"
                                        href="${this.url("pages/orders.html")}">
                                        <i class="bi bi-receipt"></i>
                                        Đơn hàng của tôi
                                    </a>
                                </li>
                                `
                        }

                        <li><hr class="dropdown-divider"></li>

                        <li>
                            <button class="dropdown-item text-danger"
                                onclick="BookStore.logout()">
                                <i class="bi bi-box-arrow-right"></i>
                                Đăng xuất
                            </button>
                        </li>
                    </ul>
                </div>
            `;
        }

        const ordersNav = document.getElementById("orders-nav");

        if (ordersNav) {
            ordersNav.style.display =
                user && user.role !== "admin"
                    ? ""
                    : "none";
        }
    },

    updateCartCount() {
        const count = this.cart().reduce(
            (total, item) => total + Number(item.quantity || 0),
            0
        );

        document.querySelectorAll("#cart-count").forEach(element => {
            element.textContent = count;
        });
    },

    notify(message, type = "success") {
        let area = document.getElementById("toast-area");

        if (!area) {
            area = document.createElement("div");
            area.id = "toast-area";
            area.className =
                "toast-container position-fixed top-0 end-0 p-3";
            document.body.appendChild(area);
        }

        const toastElement = document.createElement("div");
        toastElement.className =
            "toast align-items-center text-bg-" +
            (type === "success" ? "success" : "danger") +
            " border-0";

        toastElement.innerHTML = `
            <div class="d-flex">
                <div class="toast-body"></div>
                <button class="btn-close btn-close-white me-2 m-auto"
                    data-bs-dismiss="toast"></button>
            </div>
        `;

        toastElement.querySelector(".toast-body").textContent = message;
        area.appendChild(toastElement);

        const toast = new bootstrap.Toast(toastElement, {
            delay: 2500
        });

        toastElement.addEventListener("hidden.bs.toast", () => {
            toastElement.remove();
        });

        toast.show();
    },

    addToCart(id, quantity = 1) {
        const book = this.books.find(b => b.id === Number(id));
        quantity = Number(quantity);

        if (!book || !Number.isInteger(quantity) || quantity < 1) {
            this.notify("Sản phẩm không hợp lệ!", "error");
            return;
        }

        const cart = this.cart();
        const existing = cart.find(item => item.id === book.id);
        const currentQuantity = existing?.quantity || 0;

        if (currentQuantity + quantity > book.stock) {
            this.notify("Số lượng vượt quá tồn kho!", "error");
            return;
        }

        if (existing) {
            existing.quantity += quantity;
        } else {
            cart.push({
                id: book.id,
                quantity
            });
        }

        this.save(this.cartKey(), cart);
        this.updateCartCount();
        this.notify("Đã thêm sách vào giỏ hàng!");
    },

    logout() {
        localStorage.removeItem("currentUser");
        location.href = this.url("index.html");
    },

    requireAdmin() {
        if (this.user()?.role !== "admin") {
            location.replace(this.url("pages/login.html"));
            return false;
        }

        return true;
    },

    requireLogin() {
        if (!this.user()) {
            location.replace(this.url("pages/login.html"));
            return false;
        }

        return true;
    }
};

BookStore.ready = BookStore.init();
