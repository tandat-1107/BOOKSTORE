// ==========================================
// BOOKSTORE - BOOKS.JS
// Quản lý danh sách sách
// Tìm kiếm - Lọc - Sắp xếp - Phân trang
// ==========================================

let allBooks = [];
let filteredBooks = [];

let currentPage = 1;
const booksPerPage = 6;


// ==========================================
// ĐƯỜNG DẪN ẢNH
// ==========================================

function getBookImage(book) {

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

    const fileName = imageMap[Number(book.id)] || book.image;

    return `/assets/images/${fileName}`;
}


// ==========================================
// LOAD BOOKS.JSON
// ==========================================

async function loadBooks() {

    try {

        const response = await fetch("../data/books.json");

        if (!response.ok) {
            throw new Error("Không thể tải books.json");
        }

        const books = await response.json();

        allBooks = books;
        filteredBooks = [...allBooks];

        createCategoryFilter();

        renderBooks();

    } catch (error) {

        console.error("Lỗi tải dữ liệu sách:", error);

        const bookList = document.querySelector("#book-list");

        if (bookList) {

            bookList.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle"></i>
                        Không thể tải danh sách sách.
                        <br>
                        <small>
                            Kiểm tra lại file data/books.json
                        </small>
                    </div>
                </div>
            `;
        }
    }
}


// ==========================================
// TẠO DANH SÁCH THỂ LOẠI
// ==========================================

function createCategoryFilter() {

    const select = document.querySelector("#category-filter");

    if (!select) return;

    const categories = [
        ...new Set(
            allBooks
                .map(book => book.category)
                .filter(category => category)
        )
    ];

    select.innerHTML = `
        <option value="">Tất cả thể loại</option>
    `;

    categories.forEach(category => {

        const option = document.createElement("option");

        option.value = category;
        option.textContent = category;

        select.appendChild(option);
    });
}


// ==========================================
// RENDER SÁCH
// ==========================================

function renderBooks() {

    const container = document.querySelector("#book-list");

    if (!container) {

        console.error(
            "Không tìm thấy #book-list trong books.html"
        );

        return;
    }

    container.innerHTML = "";

    // --------------------------------------
    // Không có sách
    // --------------------------------------

    if (filteredBooks.length === 0) {

        container.innerHTML = `
            <div class="col-12">
                <div class="text-center py-5">

                    <i
                        class="bi bi-book"
                        style="font-size: 60px; color: #b0b8c4;"
                    ></i>

                    <h4 class="mt-3">
                        Không tìm thấy sách
                    </h4>

                    <p class="text-muted">
                        Hãy thử từ khóa hoặc thể loại khác.
                    </p>

                </div>
            </div>
        `;

        updateResultCount();

        renderPagination();

        return;
    }


    // --------------------------------------
    // Tính phân trang
    // --------------------------------------

    const start =
        (currentPage - 1) * booksPerPage;

    const end =
        start + booksPerPage;

    const booksToShow =
        filteredBooks.slice(start, end);


    // --------------------------------------
    // Render từng sách
    // --------------------------------------

    booksToShow.forEach(book => {

        const image = getBookImage(book);

        const col = document.createElement("div");

        col.className = "col-md-6 col-xl-4";


        col.innerHTML = `

            <div class="book-card h-100">

                <div class="book-image">

                    <img
                        src="${image}"
                        alt="${escapeHtml(book.title)}"
                        onerror="
                            this.onerror=null;
                            this.src='/assets/images/hoa-vang.jpg';
                        "
                    >

                </div>


                <div class="book-info">

                    <div class="book-category">
                        ${escapeHtml(book.category || "Sách")}
                    </div>


                    <h3 class="book-title">
                        ${escapeHtml(book.title)}
                    </h3>


                    <p class="book-author">
                        <i class="bi bi-person"></i>
                        ${escapeHtml(
                            book.author || "Đang cập nhật"
                        )}
                    </p>


                    <div class="book-rating">

                        <span class="stars">
                            ★
                        </span>

                        <span>
                            ${book.rating || 0}
                        </span>

                    </div>


                    <div class="book-price">

                        <strong>
                            ${formatPrice(book.price)}
                        </strong>

                        ${
                            book.originalPrice
                            ? `
                                <del>
                                    ${formatPrice(
                                        book.originalPrice
                                    )}
                                </del>
                            `
                            : ""
                        }

                    </div>


                    <div class="book-actions">

                        <a
                            href="book-detail.html?id=${book.id}"
                            class="btn btn-outline-primary"
                        >
                            <i class="bi bi-eye"></i>
                            Chi tiết
                        </a>


                        <button
                            class="btn btn-primary"
                            onclick="addToCart(${book.id})"
                        >
                            <i class="bi bi-cart-plus"></i>
                            Thêm giỏ
                        </button>

                    </div>

                </div>

            </div>

        `;

        container.appendChild(col);
    });


    updateResultCount();

    renderPagination();
}


// ==========================================
// CẬP NHẬT SỐ LƯỢNG
// ==========================================

function updateResultCount() {

    const resultCount =
        document.querySelector("#result-count");

    if (!resultCount) return;

    resultCount.textContent =
        filteredBooks.length;
}


// ==========================================
// PHÂN TRANG
// ==========================================

function renderPagination() {

    const pagination =
        document.querySelector("#pagination");

    if (!pagination) return;

    pagination.innerHTML = "";

    const totalPages =
        Math.ceil(
            filteredBooks.length / booksPerPage
        );

    if (totalPages <= 1) {
        return;
    }


    // Nút Previous

    const previous = document.createElement("button");

    previous.className =
        "btn btn-outline-primary";

    previous.innerHTML =
        `<i class="bi bi-chevron-left"></i>`;

    previous.disabled =
        currentPage === 1;

    previous.onclick = () => {

        if (currentPage > 1) {

            currentPage--;

            renderBooks();

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        }
    };

    pagination.appendChild(previous);


    // Số trang

    for (
        let page = 1;
        page <= totalPages;
        page++
    ) {

        const button =
            document.createElement("button");

        button.className =
            page === currentPage
            ? "btn btn-primary"
            : "btn btn-outline-primary";

        button.textContent = page;

        button.onclick = () => {

            currentPage = page;

            renderBooks();

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        };

        pagination.appendChild(button);
    }


    // Nút Next

    const next = document.createElement("button");

    next.className =
        "btn btn-outline-primary";

    next.innerHTML =
        `<i class="bi bi-chevron-right"></i>`;

    next.disabled =
        currentPage === totalPages;

    next.onclick = () => {

        if (currentPage < totalPages) {

            currentPage++;

            renderBooks();

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        }
    };

    pagination.appendChild(next);
}


// ==========================================
// TÌM KIẾM
// ==========================================

function searchBooks(keyword) {

    keyword =
        keyword
            .trim()
            .toLowerCase();


    filteredBooks =
        allBooks.filter(book => {

            const title =
                (book.title || "")
                    .toLowerCase();

            const author =
                (book.author || "")
                    .toLowerCase();

            const category =
                (book.category || "")
                    .toLowerCase();


            return (
                title.includes(keyword) ||
                author.includes(keyword) ||
                category.includes(keyword)
            );
        });


    currentPage = 1;

    renderBooks();
}


// ==========================================
// LỌC THỂ LOẠI
// ==========================================

function filterByCategory(category) {

    if (!category) {

        filteredBooks =
            [...allBooks];

    } else {

        filteredBooks =
            allBooks.filter(
                book =>
                    book.category === category
            );
    }


    currentPage = 1;

    renderBooks();
}


// ==========================================
// SẮP XẾP
// ==========================================

function sortBooks(type) {

    filteredBooks =
        [...filteredBooks];


    switch (type) {

        case "price-asc":

            filteredBooks.sort(
                (a, b) =>
                    Number(a.price) -
                    Number(b.price)
            );

            break;


        case "price-desc":

            filteredBooks.sort(
                (a, b) =>
                    Number(b.price) -
                    Number(a.price)
            );

            break;


        case "name":

            filteredBooks.sort(
                (a, b) =>
                    (a.title || "")
                        .localeCompare(
                            b.title || "",
                            "vi"
                        )
            );

            break;


        case "rating":

            filteredBooks.sort(
                (a, b) =>
                    Number(b.rating || 0) -
                    Number(a.rating || 0)
            );

            break;


        default:

            filteredBooks =
                [...filteredBooks];

            break;
    }


    currentPage = 1;

    renderBooks();
}


// ==========================================
// THÊM VÀO GIỎ
// ==========================================

function addToCart(bookId) {

    const book =
        allBooks.find(
            item =>
                Number(item.id) ===
                Number(bookId)
        );


    if (!book) {

        alert("Không tìm thấy sách!");

        return;
    }


    let cart =
        JSON.parse(
            localStorage.getItem("cart") || "[]"
        );


    const existing =
        cart.find(
            item =>
                Number(item.id) ===
                Number(bookId)
        );


    if (existing) {

        existing.quantity =
            Number(existing.quantity || 0) + 1;

    } else {

        cart.push({

            id: book.id,

            title: book.title,

            author: book.author,

            price: book.price,

            image: getBookImage(book),

            quantity: 1
        });
    }


    localStorage.setItem(
        "cart",
        JSON.stringify(cart)
    );


    updateCartCount();


    alert(
        `Đã thêm "${book.title}" vào giỏ hàng!`
    );
}


// ==========================================
// CẬP NHẬT GIỎ HÀNG
// ==========================================

function updateCartCount() {

    const cart =
        JSON.parse(
            localStorage.getItem("cart") || "[]"
        );


    const count =
        cart.reduce(
            (total, item) =>
                total +
                Number(item.quantity || 0),
            0
        );


    const badges =
        document.querySelectorAll(
            ".cart-count, #cart-count"
        );


    badges.forEach(badge => {

        badge.textContent = count;

    });
}


// ==========================================
// FORMAT GIÁ
// ==========================================

function formatPrice(price) {

    if (
        price === undefined ||
        price === null ||
        price === ""
    ) {
        return "0₫";
    }


    return Number(price)
        .toLocaleString("vi-VN") + "₫";
}


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHtml(text) {

    if (
        text === undefined ||
        text === null
    ) {
        return "";
    }


    return String(text)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");
}


// ==========================================
// KHỞI ĐỘNG
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        // Load sách
        loadBooks();


        // Cập nhật giỏ
        updateCartCount();


        // ----------------------------------
        // Tìm kiếm
        // ----------------------------------

        const searchInput =
            document.querySelector(
                "#search-input"
            );


        if (searchInput) {

            searchInput.addEventListener(
                "input",
                () => {

                    searchBooks(
                        searchInput.value
                    );

                }
            );
        }


        // ----------------------------------
        // Thể loại
        // ----------------------------------

        const categoryFilter =
            document.querySelector(
                "#category-filter"
            );


        if (categoryFilter) {

            categoryFilter.addEventListener(
                "change",
                () => {

                    filterByCategory(
                        categoryFilter.value
                    );

                }
            );
        }


        // ----------------------------------
        // Sắp xếp
        // ----------------------------------

        const sortFilter =
            document.querySelector(
                "#sort-filter"
            );


        if (sortFilter) {

            sortFilter.addEventListener(
                "change",
                () => {

                    sortBooks(
                        sortFilter.value
                    );

                }
            );
        }

    }
);