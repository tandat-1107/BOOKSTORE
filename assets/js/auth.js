
function register(event) {
    event.preventDefault();

    const name = $("#name").val().trim();
    const email = $("#email").val().trim().toLowerCase();
    const password = $("#password").val();
    const confirm = $("#confirm-password").val();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

    if (name.length < 2) {
        BookStore.notify("Họ tên cần ít nhất 2 ký tự!", "error");
        return;
    }

    if (!emailRegex.test(email)) {
        BookStore.notify("Email không hợp lệ!", "error");
        return;
    }

    if (!passwordRegex.test(password)) {
        BookStore.notify(
            "Mật khẩu cần ít nhất 6 ký tự, gồm chữ và số!",
            "error"
        );
        return;
    }

    if (password !== confirm) {
        BookStore.notify("Mật khẩu xác nhận không khớp!", "error");
        return;
    }

    if (email === "admin@bookstore.com") {
        BookStore.notify("Email này không thể đăng ký!", "error");
        return;
    }

    const users = BookStore.get("users", []);

    if (users.some(u => u.email === email)) {
        BookStore.notify("Email đã được sử dụng!", "error");
        return;
    }

    users.push({
        id: Date.now(),
        name,
        email,
        password,
        role: "customer"
    });

    BookStore.save("users", users);
    alert("Đăng ký thành công!");
    location.href = "/pages/login.html";
}

function login(event) {
    event.preventDefault();

    const email = $("#email").val().trim().toLowerCase();
    const password = $("#password").val();

    let user = null;

    // Chỉ dành cho bản demo chạy trên máy cá nhân.
    if (email === "admin@bookstore.com" &&
        password === "Admin123") {
        user = {
            id: 0,
            name: "Administrator",
            email,
            role: "admin"
        };
    } else {
        const users = BookStore.get("users", []);

        const found = users.find(
            u => u.email === email && u.password === password
        );

        if (found) {
            user = {
                id: found.id,
                name: found.name,
                email: found.email,
                role: "customer"
            };
        }
    }

    if (!user) {
        BookStore.notify("Email hoặc mật khẩu không đúng!", "error");
        return;
    }

    BookStore.save("currentUser", user);

    if (user.role === "admin") {
        location.href = "/admin/dashboard.html";
    } else {
        location.href = "/index.html";
    }
}

$(function() {
    $("#register-form").on("submit", register);
    $("#login-form").on("submit", login);
});
