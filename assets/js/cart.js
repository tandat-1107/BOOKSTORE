
const CartPage = {
    items() {
        return BookStore.cart().map(item => {
            const book = BookStore.books.find(
                b => Number(b.id) === Number(item.id)
            );

            if (!book) return null;

            return {
                book,
                quantity: Number(item.quantity)
            };
        }).filter(Boolean);
    },

    total() {
        return this.items().reduce(
            (sum, item) =>
                sum + Number(item.book.price) * item.quantity,
            0
        );
    },

    render() {
        const container = $("#cart-items");
        if (!container.length) return;

        const items = this.items();

        if (!items.length) {
            container.html(`
                <div class="empty-state">
                    <i class="bi bi-bag-x"></i>
                    <h4>Giỏ hàng đang trống</h4>
                    <p>Hãy chọn những cuốn sách yêu thích.</p>
                    <a href="${BookStore.url("pages/books.html")}"
                       class="btn btn-primary">
                        Mua sách ngay
                    </a>
                </div>
            `);
        } else {
            container.html(items.map(({ book, quantity }) => `
                <div class="cart-item">
                    <img src="${BookStore.escape(BookStore.image(book))}"
                         alt="${BookStore.escape(book.title)}">

                    <div class="flex-grow-1">
                        <a class="fw-bold text-dark"
                           href="${BookStore.url(
                               "pages/book-detail.html?id=" + book.id
                           )}">
                            ${BookStore.escape(book.title)}
                        </a>

                        <p class="text-muted small mt-1">
                            ${BookStore.escape(book.author)}
                        </p>

                        <strong class="text-danger">
                            ${BookStore.money(book.price)}
                        </strong>

                        <div class="d-flex align-items-center
                                    justify-content-between mt-3 gap-2">

                            <div class="quantity-control">
                                <button onclick="CartPage.changeQuantity(${book.id}, -1)">
                                    <i class="bi bi-dash"></i>
                                </button>

                                <span>${quantity}</span>

                                <button onclick="CartPage.changeQuantity(${book.id}, 1)">
                                    <i class="bi bi-plus"></i>
                                </button>
                            </div>

                            <button class="btn btn-sm btn-outline-danger"
                                    onclick="CartPage.remove(${book.id})">
                                <i class="bi bi-trash"></i>
                                Xóa
                            </button>
                        </div>
                    </div>
                </div>
            `).join(""));
        }

        $("#cart-subtotal, #cart-total")
            .text(BookStore.money(this.total()));

        const checkoutButton = $("#checkout-button");

        if (checkoutButton.length) {
            checkoutButton.toggleClass("disabled", !items.length);
            checkoutButton.attr("aria-disabled", String(!items.length));
        }

        BookStore.updateCartCount();
    },

    changeQuantity(id, delta) {
        const cart = BookStore.cart();

        const item = cart.find(
            x => Number(x.id) === Number(id)
        );

        const book = BookStore.books.find(
            b => Number(b.id) === Number(id)
        );

        if (!item || !book) return;

        const next = Number(item.quantity) + delta;

        if (next < 1) {
            this.remove(id);
            return;
        }

        if (next > Number(book.stock)) {
            BookStore.notify("Không đủ số lượng trong kho!", "error");
            return;
        }

        item.quantity = next;

        BookStore.save(BookStore.cartKey(), cart);
        this.render();
    },

    remove(id) {
        const cart = BookStore.cart().filter(
            item => Number(item.id) !== Number(id)
        );

        BookStore.save(BookStore.cartKey(), cart);
        this.render();
    },

    checkoutPage() {
        if (!BookStore.requireLogin()) return;

        const user = BookStore.user();
        const items = this.items();

        if (!items.length) {
            location.replace(BookStore.url("pages/cart.html"));
            return;
        }

        $("#customer-name").val(user.name);
        $("#customer-email").val(user.email);

        $("#checkout-items").html(items.map(({ book, quantity }) => `
            <div class="summary-row">
                <span>
                    ${BookStore.escape(book.title)} × ${quantity}
                </span>
                <strong>
                    ${BookStore.money(book.price * quantity)}
                </strong>
            </div>
        `).join(""));

        $("#checkout-total").text(BookStore.money(this.total()));
    },

    placeOrder(event) {
        event.preventDefault();

        const user = BookStore.user();

        if (!user) {
            location.href = BookStore.url("pages/login.html");
            return;
        }

        if (user.role === "admin") {
            BookStore.notify(
                "Hãy đăng nhập tài khoản khách hàng để đặt sách.",
                "error"
            );
            return;
        }

        const name = $("#customer-name").val().trim();
        const phone = $("#customer-phone").val().trim();
        const address = $("#customer-address").val().trim();
        const note = $("#customer-note").val().trim();

        if (name.length < 2) {
            BookStore.notify("Họ tên không hợp lệ!", "error");
            return;
        }

        if (!/^0\d{9}$/.test(phone)) {
            BookStore.notify(
                "Số điện thoại phải có 10 chữ số, bắt đầu bằng 0.",
                "error"
            );
            return;
        }

        if (address.length < 10) {
            BookStore.notify(
                "Vui lòng nhập địa chỉ giao hàng đầy đủ.",
                "error"
            );
            return;
        }

        const items = this.items();
        const cart = BookStore.cart();

        if (!items.length || items.length !== cart.length) {
            BookStore.notify(
                "Giỏ hàng có sản phẩm không hợp lệ.",
                "error"
            );
            return;
        }

        for (const { book, quantity } of items) {
            if (
                !Number.isInteger(quantity) ||
                quantity < 1 ||
                quantity > Number(book.stock)
            ) {
                BookStore.notify(
                    "Số lượng sách không hợp lệ hoặc hết hàng!",
                    "error"
                );
                return;
            }
        }

        const total = this.total();

        const order = {
            id: Date.now(),
            userId: user.id,
            customer: name,
            email: user.email,
            phone,
            address,
            note,
            items: items.map(({ book, quantity }) => ({
                id: book.id,
                title: book.title,
                image: BookStore.image(book),
                price: Number(book.price),
                quantity
            })),
            total,
            paymentMethod: "COD",
            status: "Chờ xác nhận",
            date: new Date().toLocaleString("vi-VN")
        };

        const orders = BookStore.orders();
        orders.push(order);

        items.forEach(({ book, quantity }) => {
            book.stock = Number(book.stock) - quantity;
        });

        BookStore.save("books", BookStore.books);
        BookStore.save("orders", orders);
        BookStore.save(BookStore.cartKey(), []);

        alert(
            "Đặt hàng thành công!\n" +
            "Mã đơn hàng: #" + order.id + "\n" +
            "Tổng tiền: " + BookStore.money(total)
        );

        location.href = BookStore.url("pages/orders.html");
    }
};

$(async function () {
    await BookStore.ready;

    if ($("#cart-items").length) {
        CartPage.render();
    }

    if ($("#checkout-form").length) {
        CartPage.checkoutPage();

        $("#checkout-form").on("submit", event => {
            CartPage.placeOrder(event);
        });
    }
});
