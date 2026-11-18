document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // CONFIG
    // =========================================================

    const DATA_URL = "../data/books.json";

    let allBooks = [];
    let filteredBooks = [];

    let currentPage = 1;
    const booksPerPage = 6;


    // =========================================================
    // DOM
    // =========================================================

    const bookList = document.getElementById("book-list");
    const resultCount = document.getElementById("result-count");

    const searchInput = document.getElementById("search-input");
    const categoryFilter = document.getElementById("category-filter");
    const sortFilter = document.getElementById("sort-filter");

    const pagination = document.getElementById("pagination");


    // =========================================================
    // HÀM XỬ LÝ ĐƯỜNG DẪN ẢNH
    // =========================================================

    function getBookImage(image) {

        if (!image) {
            return "../assets/images/default-book.jpg";
        }

        image = String(image).trim();

        // Ảnh từ internet
        if (
            image.startsWith("http://") ||
            image.startsWith("https://")
        ) {
            return image;
        }

        // Nếu JSON đã có ../assets/
        if (image.startsWith("../assets/")) {
            return image;
        }

        // Nếu JSON có /assets/
        if (image.startsWith("/assets/")) {
            return ".." + image;
        }

        // Nếu JSON có assets/images/...
        if (image.startsWith("assets/")) {
            return "../" + image;
        }

        // Nếu JSON chỉ có tên file
        return "../assets/images/" + image;
    }


    // =========================================================
    // LOAD DATA
    // =========================================================

    async function loadBooks() {

        try {

            const response = await fetch(DATA_URL);

            if (!response.ok) {
                throw new Error(
                    "Không thể tải books.json: " + response.status
                );
            }

            const data = await response.json();

            // Hỗ trợ cả:
            // [
            //   {...}
            // ]
            //
            // hoặc:
            // {
            //   "books": [...]
            // }

            if (Array.isArray(data)) {
                allBooks = data;
            }
            else if (Array.isArray(data.books)) {
                allBooks = data.books;
            }
            else {
                allBooks = [];
            }

            filteredBooks = [...allBooks];

            createCategoryOptions();

            applyFilters();

        }
        catch (error) {

            console.error("Lỗi tải dữ liệu sách:", error);

            if (bookList) {

                bookList.innerHTML = `
                    <div class="col-12">
                        <div class="alert alert-danger">
                            <i class="bi bi-exclamation-triangle"></i>
                            Không thể tải danh sách sách.
                            <br>
                            <small>${error.message}</small>
                        </div>
                    </div>
                `;

            }

        }

    }


    // =========================================================
    // TẠO DANH SÁCH THỂ LOẠI
    // =========================================================

    function createCategoryOptions() {

        if (!categoryFilter) {
            return;
        }

        const categories = [];

        allBooks.forEach(book => {

            const category =
                book.category ||
                book.genre ||
                book.type ||
                "";

            if (
                category &&
                !categories.includes(category)
            ) {
                categories.push(category);
            }

        });

        categories.sort((a, b) =>
            String(a).localeCompare(String(b), "vi")
        );

        categoryFilter.innerHTML = `
            <option value="">Tất cả thể loại</option>
        `;

        categories.forEach(category => {

            const option = document.createElement("option");

            option.value = category;
            option.textContent = category;

            categoryFilter.appendChild(option);

        });

    }


    // =========================================================
    // LỌC SÁCH
    // =========================================================

    function applyFilters() {

        let books = [...allBooks];

        // -------------------------
        // TÌM KIẾM
        // -------------------------

        const keyword =
            searchInput?.value
                ?.trim()
                .toLowerCase() || "";

        if (keyword) {

            books = books.filter(book => {

                const title =
                    String(
                        book.title ||
                        book.name ||
                        ""
                    ).toLowerCase();

                const author =
                    String(
                        book.author ||
                        ""
                    ).toLowerCase();

                return (
                    title.includes(keyword) ||
                    author.includes(keyword)
                );

            });

        }


        // -------------------------
        // THỂ LOẠI
        // -------------------------

        const category =
            categoryFilter?.value || "";

        if (category) {

            books = books.filter(book => {

                const bookCategory =
                    book.category ||
                    book.genre ||
                    book.type ||
                    "";

                return bookCategory === category;

            });

        }


        // -------------------------
        // SẮP XẾP
        // -------------------------

        const sort =
            sortFilter?.value || "";

        switch (sort) {

            case "price-asc":

                books.sort((a, b) =>
                    getPrice(a) - getPrice(b)
                );

                break;


            case "price-desc":

                books.sort((a, b) =>
                    getPrice(b) - getPrice(a)
                );

                break;


            case "name":

                books.sort((a, b) =>
                    getTitle(a).localeCompare(
                        getTitle(b),
                        "vi"
                    )
                );

                break;


            case "rating":

                books.sort((a, b) =>
                    getRating(b) - getRating(a)
                );

                break;

        }


        filteredBooks = books;

        currentPage = 1;

        renderBooks();

    }


    // =========================================================
    // LẤY THÔNG TIN SÁCH
    // =========================================================

    function getTitle(book) {

        return (
            book.title ||
            book.name ||
            "Sách chưa có tên"
        );

    }


    function getAuthor(book) {

        return (
            book.author ||
            "Đang cập nhật"
        );

    }


    function getCategory(book) {

        return (
            book.category ||
            book.genre ||
            book.type ||
            "Khác"
        );

    }


    function getPrice(book) {

        const price =
            book.price ??
            book.salePrice ??
            book.currentPrice ??
            0;

        return Number(
            String(price)
                .replace(/[^\d]/g, "")
        ) || 0;

    }


    function getOriginalPrice(book) {

        const price =
            book.originalPrice ??
            book.oldPrice ??
            book.listPrice ??
            book.original_price ??
            null;

        if (price === null) {
            return null;
        }

        return Number(
            String(price)
                .replace(/[^\d]/g, "")
        ) || null;

    }


    function getRating(book) {

        return Number(
            book.rating ||
            book.rate ||
            0
        );

    }


    // =========================================================
    // FORMAT GIÁ
    // =========================================================

    function formatPrice(price) {

        return Number(price).toLocaleString(
            "vi-VN"
        ) + "đ";

    }


    // =========================================================
    // RENDER SÁCH
    // =========================================================

    function renderBooks() {

        if (!bookList) {
            return;
        }

        if (resultCount) {

            resultCount.textContent =
                filteredBooks.length;

        }


        if (filteredBooks.length === 0) {

            bookList.innerHTML = `
                <div class="col-12">

                    <div class="text-center py-5">

                        <i
                            class="bi bi-book"
                            style="
                                font-size:60px;
                                color:#cbd5e1;
                            "
                        ></i>

                        <h5 class="mt-3">
                            Không tìm thấy sách
                        </h5>

                        <p class="text-muted">
                            Hãy thử tìm kiếm với từ khóa khác.
                        </p>

                    </div>

                </div>
            `;

            renderPagination();

            return;

        }


        const start =
            (currentPage - 1) * booksPerPage;

        const end =
            start + booksPerPage;

        const pageBooks =
            filteredBooks.slice(start, end);


        bookList.innerHTML =
            pageBooks
                .map(book => createBookCard(book))
                .join("");


        renderPagination();

        attachBookEvents();

    }


    // =========================================================
    // TẠO CARD SÁCH
    // =========================================================

    function createBookCard(book) {

        const title =
            getTitle(book);

        const author =
            getAuthor(book);

        const category =
            getCategory(book);

        const price =
            getPrice(book);

        const originalPrice =
            getOriginalPrice(book);

        const rating =
            getRating(book);

        const image =
            getBookImage(
                book.image ||
                book.imageUrl ||
                book.thumbnail ||
                book.cover
            );


        const bookId =
            book.id ??
            book.bookId ??
            "";


        let oldPriceHTML = "";

        if (
            originalPrice &&
            originalPrice > price
        ) {

            oldPriceHTML = `
                <span
                    class="text-muted text-decoration-line-through ms-2"
                >
                    ${formatPrice(originalPrice)}
                </span>
            `;

        }


        let ratingHTML = "";

        if (rating > 0) {

            ratingHTML = `
                <div class="small text-muted mt-2">
                    <i class="bi bi-star-fill text-warning"></i>
                    ${rating}
                </div>
            `;

        }


        return `

            <div class="col-md-6 col-xl-4">

                <div
                    class="card book-card h-100 border-0 shadow-sm"
                    data-id="${bookId}"
                >

                    <div
                        class="book-image-wrapper"
                        style="
                            height:300px;
                            background:#f1f5f9;
                            overflow:hidden;
                        "
                    >

                        <img
                            src="${image}"
                            alt="${escapeHTML(title)}"
                            class="book-image w-100 h-100"
                            style="
                                object-fit:cover;
                                display:block;
                            "
                            onerror="
                                this.onerror=null;
                                this.src='../assets/images/default-book.jpg';
                            "
                        >

                    </div>


                    <div class="card-body d-flex flex-column">

                        <div
                            class="text-uppercase small fw-bold mb-2"
                            style="color:#2563eb;"
                        >
                            ${escapeHTML(category)}
                        </div>


                        <h5
                            class="card-title fw-bold"
                            style="
                                color:#102a5c;
                                min-height:48px;
                            "
                        >
                            ${escapeHTML(title)}
                        </h5>


                        <div
                            class="small text-muted mt-2"
                        >
                            <i class="bi bi-person"></i>
                            ${escapeHTML(author)}
                        </div>


                        ${ratingHTML}


                        <div class="mt-auto pt-3">

                            <div
                                class="mb-3"
                                style="
                                    color:#dc2626;
                                    font-size:20px;
                                    font-weight:700;
                                "
                            >
                                ${formatPrice(price)}

                                ${oldPriceHTML}

                            </div>


                            <div
                                class="d-flex gap-2"
                            >

                                <button
                                    type="button"
                                    class="btn btn-outline-primary flex-grow-1 detail-btn"
                                    data-id="${bookId}"
                                >
                                    <i class="bi bi-eye"></i>
                                    Chi tiết
                                </button>


                                <button
                                    type="button"
                                    class="btn btn-primary flex-grow-1 add-cart-btn"
                                    data-id="${bookId}"
                                >
                                    <i class="bi bi-cart-plus"></i>
                                    Thêm giỏ
                                </button>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        `;

    }


    // =========================================================
    // ESCAPE HTML
    // =========================================================

    function escapeHTML(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    // =========================================================
    // EVENT CARD
    // =========================================================

    function attachBookEvents() {

        // -------------------------
        // CHI TIẾT
        // -------------------------

        document
            .querySelectorAll(".detail-btn")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const id =
                            button.dataset.id;

                        if (!id) {
                            return;
                        }

                        window.location.href =
                            `book-detail.html?id=${encodeURIComponent(id)}`;

                    }
                );

            });


        // -------------------------
        // THÊM GIỎ HÀNG
        // -------------------------

        document
            .querySelectorAll(".add-cart-btn")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const id =
                            button.dataset.id;

                        const book =
                            allBooks.find(
                                item =>
                                    String(
                                        item.id ??
                                        item.bookId
                                    ) === String(id)
                            );


                        if (!book) {
                            return;
                        }


                        addToCart(book);


                        button.innerHTML = `
                            <i class="bi bi-check-lg"></i>
                            Đã thêm
                        `;


                        button.classList.remove(
                            "btn-primary"
                        );

                        button.classList.add(
                            "btn-success"
                        );


                        setTimeout(() => {

                            button.innerHTML = `
                                <i class="bi bi-cart-plus"></i>
                                Thêm giỏ
                            `;

                            button.classList.remove(
                                "btn-success"
                            );

                            button.classList.add(
                                "btn-primary"
                            );

                        }, 1200);

                    }
                );

            });

    }


    // =========================================================
    // GIỎ HÀNG
    // =========================================================

    function addToCart(book) {

        let cart = [];

        try {

            cart =
                JSON.parse(
                    localStorage.getItem("cart")
                ) || [];

        }
        catch (error) {

            cart = [];

        }


        const id =
            book.id ??
            book.bookId;


        const existing =
            cart.find(
                item =>
                    String(
                        item.id ??
                        item.bookId
                    ) === String(id)
            );


        if (existing) {

            existing.quantity =
                Number(existing.quantity || 1) + 1;

        }
        else {

            cart.push({

                ...book,

                quantity: 1

            });

        }


        localStorage.setItem(
            "cart",
            JSON.stringify(cart)
        );


        // Cho cart.js / header cập nhật
        window.dispatchEvent(
            new Event("cartUpdated")
        );

    }


    // =========================================================
    // PHÂN TRANG
    // =========================================================

    function renderPagination() {

        if (!pagination) {
            return;
        }

        const totalPages =
            Math.ceil(
                filteredBooks.length /
                booksPerPage
            );


        if (totalPages <= 1) {

            pagination.innerHTML = "";

            return;

        }


        let html = "";


        // Previous

        html += `
            <button
                class="btn btn-outline-primary pagination-btn"
                data-page="${currentPage - 1}"
                ${currentPage === 1 ? "disabled" : ""}
            >
                <i class="bi bi-chevron-left"></i>
            </button>
        `;


        // Pages

        for (
            let page = 1;
            page <= totalPages;
            page++
        ) {

            html += `
                <button
                    class="btn ${
                        page === currentPage
                            ? "btn-primary"
                            : "btn-outline-primary"
                    } pagination-btn"
                    data-page="${page}"
                >
                    ${page}
                </button>
            `;

        }


        // Next

        html += `
            <button
                class="btn btn-outline-primary pagination-btn"
                data-page="${currentPage + 1}"
                ${currentPage === totalPages ? "disabled" : ""}
            >
                <i class="bi bi-chevron-right"></i>
            </button>
        `;


        pagination.innerHTML = html;


        document
            .querySelectorAll(".pagination-btn")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const page =
                            Number(
                                button.dataset.page
                            );


                        if (
                            page < 1 ||
                            page > totalPages
                        ) {
                            return;
                        }


                        currentPage = page;

                        renderBooks();


                        window.scrollTo({
                            top: 0,
                            behavior: "smooth"
                        });

                    }
                );

            });

    }


    // =========================================================
    // EVENT FILTER
    // =========================================================

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            applyFilters
        );

    }


    if (categoryFilter) {

        categoryFilter.addEventListener(
            "change",
            applyFilters
        );

    }


    if (sortFilter) {

        sortFilter.addEventListener(
            "change",
            applyFilters
        );

    }


    // =========================================================
    // KHỞI CHẠY
    // =========================================================

    loadBooks();

});