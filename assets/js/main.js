
const BookStore = {
    books: [],
    ready: null,

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
            const response = await fetch("/data/books.json");
            if (!response.ok) throw new Error("Không tải được books.json");

            const defaults = await response.json();
            const saved = this.get("books", null);

            this.books = Array.isArray(saved) ? saved : defaults;

            if (!Array.isArray(saved)) {
                this.save("books", defaults);
            }
        } catch (error) {
            console.error(error);
            this.books = this.get("books", []);
        }

        await this.loadLayout();
    },

    async loadLayout() {
        await Promise.all([
            new Promise(resolve =>
                $("#header").load("/components/header.html", resolve)
            ),
            new Promise(resolve =>
                $("#footer").load("/components/footer.html", resolve)
            )
        ]);

        const user = this.user();

        if (user) {
            $("#account-menu").html(`
                <div class="dropdown">
                    <button class="btn btn-light dropdown-toggle"
                        data-bs-toggle="dropdown">
                        <i class="bi bi-person-circle"></i>
                        ${this.escape(user.name)}
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        ${user.role === "admin" ? `
                            <li>
                                <a class="dropdown-item"
                                    href="/admin/dashboard.html">
                                    Quản trị
                                </a>
                            </li>
                        ` : `
                            <li>
                                <a class="dropdown-item"
                                    href="/pages/orders.html">
                                    Đơn hàng của tôi
                                </a>
                            </li>
                        `}
                        <li><hr class="dropdown-divider"></li>
                        <li>
                            <button class="dropdown-item"
                                onclick="BookStore.logout()">
                                Đăng xuất
                            </button>
                        </li>
                    </ul>
                </div>
            `);
        }

        $("#orders-nav").toggle(!!user && user.role !== "admin");

        $("#header-search-form").on("submit", function(event) {
            event.preventDefault();
            const keyword = $("#header-keyword").val().trim();
            location.href =
                "/pages/books.html?q=" + encodeURIComponent(keyword);
        });

        this.updateCartCount();
    },

    updateCartCount() {
        const count = this.cart().reduce(
            (total, item) => total + item.quantity, 0
        );

        $("#cart-count").text(count);
    },

    notify(message, type = "success") {
        const color = type === "success" ? "success" : "danger";

        if (!$("#toast-area").length) {
            $("body").append(`
                <div id="toast-area"
                    class="toast-container position-fixed top-0 end-0 p-3">
                </div>
            `);
        }

        const element = $(`
            <div class="toast align-items-center text-bg-${color} border-0">
                <div class="d-flex">
                    <div class="toast-body"></div>
                    <button type="button" class="btn-close btn-close-white
                        me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `);

        element.find(".toast-body").text(message);
        $("#toast-area").append(element);

        const toast = new bootstrap.Toast(element[0], {
            delay: 2500
        });

        element.on("hidden.bs.toast", () => element.remove());
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
            cart.push({ id: book.id, quantity });
        }

        this.save(this.cartKey(), cart);
        this.updateCartCount();
        this.notify("Đã thêm sách vào giỏ hàng!");
    },

    logout() {
        localStorage.removeItem("currentUser");
        location.href = "/index.html";
    },

    requireAdmin() {
        if (this.user()?.role !== "admin") {
            location.replace("/pages/login.html");
            return false;
        }
        return true;
    },

    requireLogin() {
        if (!this.user()) {
            location.replace("/pages/login.html");
            return false;
        }
        return true;
    }
};

BookStore.ready = BookStore.init();
