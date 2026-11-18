
const BookStore = {
    books: [],
    ready: null,

    base: location.hostname.endsWith("github.io")
        ? "/BOOKSTORE" : "",

    url(path) {
        const p = String(path).replace(/^\/+/, "");
        return this.base + "/" + p;
    },

    get(key, fallback = []) {
        try {
            const raw = localStorage.getItem(key);
            return raw === null ? fallback : JSON.parse(raw);
        } catch (error) {
            console.error("Storage error:", error);
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
        return String(value ?? "").replace(/[&<>"']/g, c => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[c]));
    },

    image(book) {
        const map = {
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

        if (map[Number(book.id)]) {
            return this.url("assets/images/" + map[Number(book.id)]);
        }

        const src = String(book.image || "").trim();

        if (/^https?:\/\//i.test(src)) return src;
        if (!src) return this.url("assets/images/dac-nhan-tam.jpg");

        return this.url(
            "assets/images/" + src.split("/").pop()
        );
    },

    user() {
        return this.get("currentUser", null);
    },

    cartKey() {
        return "cart_" + (this.user()?.id ?? "guest");
    },

    cart() {
        const cart = this.get(this.cartKey(), []);
        return Array.isArray(cart) ? cart : [];
    },

    orders() {
        const orders = this.get("orders", []);
        return Array.isArray(orders) ? orders : [];
    },

    async init() {
        try {
            const response = await fetch(
                this.url("data/books.json")
            );

            if (!response.ok) {
                throw new Error("Không tải được books.json");
            }

            const defaults = await response.json();

            if (!Array.isArray(defaults)) {
                throw new Error("Dữ liệu sách không hợp lệ");
            }

            const saved = this.get("books", null);

            if (Array.isArray(saved)) {
                // Giữ các sách đã sửa trong Admin.
                // Bổ sung sách mẫu còn thiếu từ JSON.
                const merged = [...saved];

                defaults.forEach(book => {
                    const exists = merged.some(
                        b => Number(b.id) === Number(book.id)
                    );

                    if (!exists) merged.push(book);
                });

                this.books = merged;
            } else {
                this.books = defaults;
            }

            this.save("books", this.books);

            console.log(
                "BOOKSTORE loaded:",
                this.books.length,
                "books"
            );
        } catch (error) {
            console.error(error);
            this.books = this.get("books", []);
        }

        await this.loadLayout();
    },

    async loadLayout() {
        const load = async (selector, path) => {
            const element = document.querySelector(selector);
            if (!element) return;

            try {
                const response = await fetch(this.url(path));
                if (!response.ok) throw new Error(path);
                element.innerHTML = await response.text();
            } catch (error) {
                console.error("Layout error:", error);
            }
        };

        await Promise.all([
            load("#header", "components/header.html"),
            load("#footer", "components/footer.html")
        ]);

        document.querySelectorAll(
            "#header a[href^='/'], #footer a[href^='/']"
        ).forEach(link => {
            const href = link.getAttribute("href");
            if (this.base && href.startsWith(this.base + "/")) return;
            link.setAttribute("href", this.base + href);
        });

        this.renderAccountMenu();
        this.updateCartCount();

        const search = document.getElementById("header-search-form");

        if (search) {
            search.addEventListener("submit", event => {
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
    },

    renderAccountMenu() {
        const menu = document.getElementById("account-menu");
        if (!menu) return;

        const user = this.user();

        if (!user) {
            menu.innerHTML = `
                <div class="d-flex gap-2">
                    <a class="btn btn-outline-primary btn-sm"
                       href="${this.url("pages/login.html")}">
                        Đăng nhập
                    </a>
                    <a class="btn btn-primary btn-sm"
                       href="${this.url("pages/register.html")}">
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
                    <button class="btn btn-light dropdown-toggle"
                            data-bs-toggle="dropdown">
                        <i class="bi bi-person-circle"></i>
                        ${this.escape(user.name)}
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li>
                            <a class="dropdown-item"
                               href="${this.url(destination)}">
                                ${user.role === "admin"
                                    ? "Quản trị"
                                    : "Đơn hàng của tôi"}
                            </a>
                        </li>
                        <li><hr class="dropdown-divider"></li>
                        <li>
                            <button class="dropdown-item"
                                    onclick="BookStore.logout()">
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
                user && user.role !== "admin" ? "" : "none";
        }
    },

    updateCartCount() {
        const count = this.cart().reduce(
            (sum, item) => sum + Number(item.quantity || 0), 0
        );

        document.querySelectorAll("#cart-count").forEach(el => {
            el.textContent = count;
        });
    },

    addToCart(id, quantity = 1) {
        const book = this.books.find(
            b => Number(b.id) === Number(id)
        );

        quantity = Number(quantity);

        if (!book || !Number.isInteger(quantity) || quantity < 1) {
            this.notify("Sản phẩm không hợp lệ!", "error");
            return false;
        }

        const cart = this.cart();
        const existing = cart.find(
            item => Number(item.id) === Number(id)
        );

        const current = Number(existing?.quantity || 0);

        if (current + quantity > Number(book.stock)) {
            this.notify("Không đủ số lượng trong kho!", "error");
            return false;
        }

        if (existing) {
            existing.quantity = current + quantity;
        } else {
            cart.push({ id: Number(id), quantity });
        }

        this.save(this.cartKey(), cart);
        this.updateCartCount();
        this.notify("Đã thêm vào giỏ hàng!");

        return true;
    },

    notify(message, type = "success") {
        if (typeof bootstrap === "undefined") {
            alert(message);
            return;
        }

        let area = document.getElementById("toast-area");

        if (!area) {
            area = document.createElement("div");
            area.id = "toast-area";
            area.className =
                "toast-container position-fixed top-0 end-0 p-3";
            document.body.appendChild(area);
        }

        const el = document.createElement("div");
        el.className = `toast text-bg-${
            type === "success" ? "success" : "danger"
        } border-0`;

        el.innerHTML = `
            <div class="d-flex">
                <div class="toast-body"></div>
                <button class="btn-close btn-close-white me-2 m-auto"
                        data-bs-dismiss="toast"></button>
            </div>
        `;

        el.querySelector(".toast-body").textContent = message;
        area.appendChild(el);

        el.addEventListener("hidden.bs.toast", () => el.remove());

        new bootstrap.Toast(el, { delay: 2500 }).show();
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
    }
};

BookStore.ready = BookStore.init();

const BookStore = {
    books: [],
    ready: null,

    base: location.hostname.endsWith("github.io")
        ? "/BOOKSTORE"
        : "",

    url(path) {
        return this.base + "/" +
            String(path).replace(/^\/+/, "");
    },

    get(key, fallback = []) {
        try {
            const raw = localStorage.getItem(key);
            return raw === null ? fallback : JSON.parse(raw);
        } catch (error) {
            console.error("Storage error:", error);
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
        return String(value ?? "").replace(/[&<>"']/g, c => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[c]));
    },

    // ==========================================
    // XỬ LÝ ẢNH SÁCH
    // ==========================================

    image(book) {
        const src = String(book.image || "").trim();

        // Ảnh sách cũ do khách tải lên
        if (src.startsWith("data:image/")) {
            return src;
        }

        const map = {
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

        const filename = map[Number(book.id)];

        if (filename) {
            return this.url("assets/images/" + filename);
        }

        if (/^https?:\/\//i.test(src)) {
            return src;
        }

        if (!src) {
            return this.url("assets/images/dac-nhan-tam.jpg");
        }

        return this.url(
            "assets/images/" + src.split("/").pop()
        );
    },

    // ==========================================
    // TÀI KHOẢN
    // ==========================================

    user() {
        return this.get("currentUser", null);
    },

    cartKey() {
        return "cart_" + (this.user()?.id ?? "guest");
    },

    cart() {
        const cart = this.get(this.cartKey(), []);
        return Array.isArray(cart) ? cart : [];
    },

    orders() {
        const orders = this.get("orders", []);
        return Array.isArray(orders) ? orders : [];
    },

    // ==========================================
    // KHỞI TẠO SÁCH
    // ==========================================

    async init() {
        try {
            const response = await fetch(
                this.url("data/books.json")
            );

            if (!response.ok) {
                throw new Error("Không tải được books.json");
            }

            const defaults = await response.json();

            if (!Array.isArray(defaults)) {
                throw new Error("Dữ liệu sách không hợp lệ");
            }

            const saved = this.get("books", null);

            if (Array.isArray(saved)) {
                const merged = [...saved];

                defaults.forEach(book => {
                    const exists = merged.some(
                        b => Number(b.id) === Number(book.id)
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

        } catch (error) {
            console.error(error);
            this.books = this.get("books", []);
        }

        await this.loadLayout();
    },

    // ==========================================
    // HEADER VÀ FOOTER
    // ==========================================

    async loadLayout() {
        const load = async (selector, path) => {
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
            load("#header", "components/header.html"),
            load("#footer", "components/footer.html")
        ]);

        document.querySelectorAll(
            "#header a[href^='/'], #footer a[href^='/']"
        ).forEach(link => {
            const href = link.getAttribute("href");

            if (
                this.base &&
                href.startsWith(this.base + "/")
            ) return;

            link.setAttribute("href", this.base + href);
        });

        this.renderAccountMenu();
        this.updateCartCount();

        const search = document.getElementById(
            "header-search-form"
        );

        if (search) {
            search.addEventListener("submit", event => {
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
    },

    // ==========================================
    // MENU TÀI KHOẢN
    // ==========================================

    renderAccountMenu() {
        const menu = document.getElementById("account-menu");

        if (!menu) return;

        const user = this.user();

        if (!user) {
            menu.innerHTML = `
                <div class="d-flex gap-2">
                    <a class="btn btn-outline-primary btn-sm"
                       href="${this.url("pages/login.html")}">
                        Đăng nhập
                    </a>

                    <a class="btn btn-primary btn-sm"
                       href="${this.url("pages/register.html")}">
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
                    <button class="btn btn-light dropdown-toggle"
                            data-bs-toggle="dropdown">
                        <i class="bi bi-person-circle"></i>
                        ${this.escape(user.name)}
                    </button>

                    <ul class="dropdown-menu dropdown-menu-end">
                        <li>
                            <a class="dropdown-item"
                               href="${this.url(destination)}">
                                ${user.role === "admin"
                                    ? "Quản trị"
                                    : "Đơn hàng của tôi"}
                            </a>
                        </li>

                        <li><hr class="dropdown-divider"></li>

                        <li>
                            <button class="dropdown-item"
                                    onclick="BookStore.logout()">
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
                user && user.role !== "admin" ? "" : "none";
        }

        const sellRequestsNav = document.getElementById(
            "sell-requests-nav"
        );

        if (sellRequestsNav) {
            sellRequestsNav.style.display =
                user && user.role !== "admin" ? "" : "none";
        }
    },

    // ==========================================
    // GIỎ HÀNG
    // ==========================================

    updateCartCount() {
        const count = this.cart().reduce(
            (sum, item) =>
                sum + Number(item.quantity || 0),
            0
        );

        document.querySelectorAll("#cart-count").forEach(el => {
            el.textContent = count;
        });
    },

    addToCart(id, quantity = 1) {
        const book = this.books.find(
            b => Number(b.id) === Number(id)
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

        const current = Number(existing?.quantity || 0);

        if (current + quantity > Number(book.stock)) {
            this.notify("Không đủ số lượng trong kho!", "error");
            return false;
        }

        if (existing) {
            existing.quantity = current + quantity;
        } else {
            cart.push({
                id: Number(id),
                quantity
            });
        }

        this.save(this.cartKey(), cart);
        this.updateCartCount();
        this.notify("Đã thêm vào giỏ hàng!");

        return true;
    },

    // ==========================================
    // THÔNG BÁO
    // ==========================================

    notify(message, type = "success") {
        if (typeof bootstrap === "undefined") {
            alert(message);
            return;
        }

        let area = document.getElementById("toast-area");

        if (!area) {
            area = document.createElement("div");
            area.id = "toast-area";
            area.className =
                "toast-container position-fixed top-0 end-0 p-3";
            document.body.appendChild(area);
        }

        const element = document.createElement("div");

        element.className = `toast text-bg-${
            type === "success" ? "success" : "danger"
        } border-0`;

        element.innerHTML = `
            <div class="d-flex">
                <div class="toast-body"></div>
                <button class="btn-close btn-close-white me-2 m-auto"
                        data-bs-dismiss="toast"></button>
            </div>
        `;

        element.querySelector(".toast-body").textContent = message;
        area.appendChild(element);

        element.addEventListener("hidden.bs.toast", () => {
            element.remove();
        });

        new bootstrap.Toast(element, {
            delay: 2500
        }).show();
    },

    // ==========================================
    // ĐĂNG XUẤT VÀ PHÂN QUYỀN
    // ==========================================

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
    }
};

BookStore.ready = BookStore.init();
