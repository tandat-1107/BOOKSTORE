
let currentPage = 1;
const pageSize = 8;

function bookCard(book) {
    const e = BookStore.escape;
    const price = Number(book.price || 0);
    const old = Number(book.originalPrice || 0);

    const discount = old > price
        ? Math.round((1 - price / old) * 100)
        : 0;

    const detail = BookStore.url(
        "pages/book-detail.html?id=" + book.id
    );

    return `
        <div class="col-6 col-md-4 col-xl-3">
            <div class="book-card h-100">
                <div class="book-image">
                    ${discount ? `
                        <span class="discount-badge">-${discount}%</span>
                    ` : ""}

                    <a href="${detail}">
                        <img src="${e(BookStore.image(book))}"
                             alt="${e(book.title)}"
                             loading="lazy">
                    </a>
                </div>

                <div class="book-info">
                    <div class="book-category">
                        ${e(book.category)}
                    </div>

                    <h3 class="book-title">
                        <a href="${detail}">${e(book.title)}</a>
                    </h3>

                    <p class="book-author">${e(book.author)}</p>

                    <div class="book-rating">
                        <i class="bi bi-star-fill"></i>
                        ${Number(book.rating || 0).toFixed(1)}
                    </div>

                    <div class="mt-2">
                        <span class="book-price">
                            ${BookStore.money(price)}
                        </span>
                        ${old > price ? `
                            <span class="old-price">
                                ${BookStore.money(old)}
                            </span>
                        ` : ""}
                    </div>

                    <button class="btn btn-primary book-add"
                            onclick="BookStore.addToCart(${Number(book.id)})"
                            ${Number(book.stock) <= 0 ? "disabled" : ""}>
                        <i class="bi bi-bag-plus"></i>
                        ${Number(book.stock) > 0
                            ? "Thêm vào giỏ" : "Hết hàng"}
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderBooks(books, selector = "#book-list") {
    const container = $(selector);
    if (!container.length) return;

    if (!books.length) {
        container.html(`
            <div class="col-12">
                <div class="empty-state">
                    <i class="bi bi-search"></i>
                    <h4>Không tìm thấy sách</h4>
                    <p>Hãy thử từ khóa hoặc thể loại khác.</p>
                </div>
            </div>
        `);
        return;
    }

    container.html(books.map(bookCard).join(""));
}

function filterBooks(reset = false) {
    if (reset) currentPage = 1;

    const keyword = ($("#search-input").val() || "")
        .trim().toLocaleLowerCase("vi-VN");

    const category = $("#category-filter").val() || "";
    const sort = $("#sort-filter").val() || "";

    let books = BookStore.books.filter(book => {
        const text = `${book.title} ${book.author}`
            .toLocaleLowerCase("vi-VN");

        return text.includes(keyword) &&
            (!category || book.category === category);
    });

    if (sort === "price-asc") {
        books.sort((a, b) => a.price - b.price);
    } else if (sort === "price-desc") {
        books.sort((a, b) => b.price - a.price);
    } else if (sort === "name") {
        books.sort((a, b) => a.title.localeCompare(b.title, "vi"));
    } else if (sort === "rating") {
        books.sort((a, b) => b.rating - a.rating);
    }

    $("#result-count").text(books.length);

    const totalPages = Math.ceil(books.length / pageSize);
    currentPage = Math.min(currentPage, Math.max(1, totalPages));

    const start = (currentPage - 1) * pageSize;
    renderBooks(books.slice(start, start + pageSize));

    $("#pagination").html(
        Array.from({ length: totalPages }, (_, index) => {
            const page = index + 1;

            return `
                <button class="btn btn-sm ${
                    page === currentPage
                        ? "btn-primary" : "btn-outline-primary"
                }" onclick="goToPage(${page})">
                    ${page}
                </button>
            `;
        }).join("")
    );
}

function goToPage(page) {
    currentPage = page;
    filterBooks();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function showBookDetail() {
    const id = Number(
        new URLSearchParams(location.search).get("id")
    );

    const book = BookStore.books.find(
        b => Number(b.id) === id
    );

    if (!book) {
        $("#book-detail").html(`
            <div class="empty-state">
                <h3>Không tìm thấy sách!</h3>
                <a class="btn btn-primary"
                   href="${BookStore.url("pages/books.html")}">
                    Quay lại cửa hàng
                </a>
            </div>
        `);
        return;
    }

    const e = BookStore.escape;

    $("#book-detail").html(`
        <div class="row g-5">
            <div class="col-lg-5">
                <div class="detail-image">
                    <img src="${e(BookStore.image(book))}"
                         alt="${e(book.title)}">
                </div>
            </div>

            <div class="col-lg-7">
                <span class="book-category">${e(book.category)}</span>
                <h1 class="detail-title mt-3">${e(book.title)}</h1>
                <p class="detail-meta mt-3">
                    Tác giả: <strong>${e(book.author)}</strong>
                </p>

                <div class="book-rating">
                    <i class="bi bi-star-fill"></i>
                    ${Number(book.rating || 0).toFixed(1)}
                </div>

                <hr>

                <div class="my-4">
                    <span class="detail-price">
                        ${BookStore.money(book.price)}
                    </span>
                </div>

                <p>${e(book.description)}</p>
                <p>Còn ${Number(book.stock)} sản phẩm</p>

                <div class="d-flex align-items-center gap-3 my-4">
                    <label for="detail-quantity">Số lượng:</label>
                    <input id="detail-quantity"
                           type="number"
                           class="form-control"
                           style="width:100px"
                           min="1"
                           max="${Number(book.stock)}"
                           value="1">
                </div>

                <button id="detail-add"
                        class="btn btn-primary btn-lg"
                        ${Number(book.stock) <= 0 ? "disabled" : ""}>
                    <i class="bi bi-bag-plus"></i>
                    Thêm vào giỏ
                </button>

                <a class="btn btn-outline-primary btn-lg ms-2"
                   href="${BookStore.url("pages/cart.html")}">
                    Xem giỏ hàng
                </a>
            </div>
        </div>
    `);

    $("#detail-add").on("click", () => {
        BookStore.addToCart(
            book.id,
            Number($("#detail-quantity").val())
        );
    });

    const related = BookStore.books
        .filter(b => b.category === book.category && b.id !== book.id)
        .slice(0, 4);

    renderBooks(related, "#related-books");
}

$(async function () {
    await BookStore.ready;

    if ($("#featured-books").length) {
        renderBooks(BookStore.books.slice(0, 8), "#featured-books");
    }

    if ($("#book-list").length) {
        const categories = [
            ...new Set(BookStore.books.map(b => b.category))
        ];

        $("#category-filter").html(
            '<option value="">Tất cả thể loại</option>'
        );

        categories.forEach(category => {
            $("#category-filter").append(
                $("<option>").val(category).text(category)
            );
        });

        const params = new URLSearchParams(location.search);

        $("#search-input").val(params.get("q") || "");
        $("#category-filter").val(params.get("category") || "");

        filterBooks();

        $("#search-input").on("input", () => filterBooks(true));
        $("#category-filter, #sort-filter")
            .on("change", () => filterBooks(true));
    }

    if ($("#book-detail").length) {
        showBookDetail();
    }
});
