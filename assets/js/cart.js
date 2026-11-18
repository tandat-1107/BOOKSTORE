
function validCartItems() {
    return BookStore.cart().map(item => {
        const book = BookStore.books.find(b => b.id === item.id);
        return book ? { ...item, book } : null;
    }).filter(Boolean);
}

function cartTotal() {
    return validCartItems().reduce(
        (sum, item) => sum + item.book.price * item.quantity, 0
    );
}

function renderCart() {
    const items = validCartItems();

    if (!items.length) {
        $("#cart-items").html(`
            <div class="empty-state">
                <i class="bi bi-bag-x"></i>
                <h4>Giỏ hàng đang trống</h4>
                <p>Hãy khám phá và chọn những cuốn sách yêu thích.</p>
                <a href="/pages/books.html" class="btn btn-primary">
                    Khám phá sách
                </a>
            </div>
        `);
    } else {
        $("#cart-items").html(items.map(({ book, quantity }) => `
            <div class="cart-item">
                <img src="${BookStore.escape(book.image)}"
                    alt="${BookStore.escape(book.title)}">

                <div class="flex-grow-1">
                    <a href="/pages/book-detail.html?id=${book.id}"
                        class="fw-bold text-dark">
                        ${BookStore.escape(book.title)}
                    </a>

                    <p class="text-muted small mt-1">
                        ${BookStore.escape(book.author)}
                    </p>

                    <strong class="text-danger">
                        ${BookStore.money(book.price)}
                    </strong>

                    <div class="d-flex align-items-center
                        justify-content-between mt-3 flex-wrap gap-2">
                        <div class="quantity-control">
                            <button onclick="changeQuantity(${book.id}, -1)">
                                <i class="bi bi-dash"></i>
                            </button>
                            <span>${quantity}</span>
                            <button onclick="changeQuantity(${book.id}, 1)">
                                <i class="bi bi-plus"></i>
                            </button>
                        </div>

                        <button class="btn btn-sm btn-outline-danger"
                            onclick="removeCartItem(${book.id})">
                            <i class="bi bi-trash"></i> Xóa
                        </button>
                    </div>
                </div>
            </div>
        `).join(""));
    }

    $("#cart-subtotal, #cart-total, #checkout-total")
        .text(BookStore.money(cartTotal()));
}

function changeQuantity(id, delta) {
    const cart = BookStore.cart();
    const item = cart.find(i => i.id === id);
    const book = BookStore.books.find(b => b.id === id);

    if (!item || !book) return;

    const next = item.quantity + delta;

    if (next < 1) {
        removeCartItem(id);
        return;
    }

    if (next > book.stock) {
        BookStore.notify("Không đủ số lượng trong kho!", "error");
        return;
    }

    item.quantity = next;
    BookStore.save(BookStore.cartKey(), cart);
    BookStore.updateCartCount();
    renderCart();
}

function removeCartItem(id) {
    const cart = BookStore.cart().filter(item => item.id !== id);
    BookStore.save(BookStore.cartKey(), cart);
    BookStore.updateCartCount();
    renderCart();
}

function renderCheckout() {
    const user = BookStore.user();
    if (!user) return;

    $("#customer-name").val(user.name);
    $("#customer-email").val(user.email);

    const items = validCartItems();

    $("#checkout-items").html(items.map(({ book, quantity }) => `
        <div class="summary-row">
            <span>${BookStore.escape(book.title)} × ${quantity}</span>
            <strong>${BookStore.money(book.price * quantity)}</strong>
        </div>
    `).join(""));

    $("#checkout-total").text(BookStore.money(cartTotal()));
}

function placeOrder(event) {
    event.preventDefault();

    const user = BookStore.user();
    if (!user) {
        location.href = "/pages/login.html";
        return;
    }

    const name = $("#customer-name").val().trim();
    const phone = $("#customer-phone").val().trim();
    const address = $("#customer-address").val().trim();
    const note = $("#customer-note").val().trim();

    if (name.length < 2 || !/^0\d{9}$/.test(phone) ||
        address.length < 10) {
        BookStore.notify("Thông tin nhận hàng chưa hợp lệ!", "error");
        return;
    }

    const cart = BookStore.cart();

    if (!cart.length) {
        BookStore.notify("Giỏ hàng đang trống!", "error");
        return;
    }

    let total = 0;
    const items = [];

    for (const item of cart) {
        const book = BookStore.books.find(b => b.id === item.id);

        if (!book || !Number.isInteger(item.quantity) ||
            item.quantity < 1 || item.quantity > book.stock) {
            BookStore.notify("Số lượng sách không hợp lệ!", "error");
            return;
        }

        total += book.price * item.quantity;

        items.push({
            id: book.id,
            title: book.title,
            image: book.image,
            price: book.price,
            quantity: item.quantity
        });
    }

    const orders = BookStore.orders();

    const order = {
        id: Date.now(),
        userId: user.id,
        customer: name,
        email: user.email,
        phone,
        address,
        note,
        items,
        total,
        paymentMethod: "COD",
        status: "Chờ xác nhận",
        date: new Date().toLocaleString("vi-VN")
    };

    orders.push(order);

    BookStore.books.forEach(book => {
        const item = cart.find(i => i.id === book.id);
        if (item) book.stock -= item.quantity;
    });

    BookStore.save("books", BookStore.books);
    BookStore.save("orders", orders);
    BookStore.save(BookStore.cartKey(), []);

    alert("Đặt hàng thành công! Mã đơn: #" + order.id);
    location.href = "/pages/orders.html";
}

$(async function() {
    await BookStore.ready;

    if ($("#cart-items").length) renderCart();

    if ($("#checkout-form").length) {
        if (!BookStore.requireLogin()) return;

        renderCheckout();
        $("#checkout-form").on("submit", placeOrder);
    }
});
