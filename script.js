
const STORAGE_KEY = "taskly-tasks-v1";

const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const taskDate = document.getElementById("taskDate");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const toast = document.getElementById("toast");

const totalTasks = document.getElementById("totalTasks");
const pendingTasks = document.getElementById("pendingTasks");
const completedTasks = document.getElementById("completedTasks");
const taskCount = document.getElementById("taskCount");
const progressText = document.getElementById("progressText");
const progressBar = document.getElementById("progressBar");
const progressFill = document.getElementById("progressFill");
const footerText = document.getElementById("footerText");
const clearCompleted = document.getElementById("clearCompleted");

let tasks = loadTasks();
let currentFilter = "all";
let toastTimeout;

function loadTasks() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : [];

        if (!Array.isArray(parsed)) return [];

        return parsed.filter(task =>
            task &&
            typeof task.id === "string" &&
            typeof task.title === "string" &&
            typeof task.completed === "boolean" &&
            typeof task.date === "string"
        );
    } catch (error) {
        console.error("Gagal membaca tugas:", error);
        return [];
    }
}

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return true;
    } catch (error) {
        console.error("Gagal menyimpan tugas:", error);
        showToast("Penyimpanan gagal. Periksa browser kamu.");
        return false;
    }
}

function showToast(message) {
    clearTimeout(toastTimeout);

    toast.textContent = message;
    toast.classList.add("show");

    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

function formatDate(dateString) {
    if (!dateString) return "";

    const parts = dateString.split("-").map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);

    return "Tenggat: " + date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function isOverdue(task) {
    if (!task.date || task.completed) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadline = new Date(task.date + "T00:00:00");

    return deadline < today;
}

function renderTasks() {
    taskList.replaceChildren();

    const filteredTasks = tasks.filter(task => {
        if (currentFilter === "pending") {
            return !task.completed;
        }

        if (currentFilter === "completed") {
            return task.completed;
        }

        return true;
    });

    filteredTasks.forEach(task => {
        const item = document.createElement("article");
        item.className = "task-item" +
            (task.completed ? " done" : "");

        const main = document.createElement("div");
        main.className = "task-main";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "task-check";
        checkbox.checked = task.completed;
        checkbox.setAttribute(
            "aria-label",
            "Tandai " + task.title + " selesai"
        );

        checkbox.addEventListener("change", () => {
            toggleTask(task.id);
        });

        const info = document.createElement("div");
        info.className = "task-info";

        const title = document.createElement("p");
        title.className = "task-title";
        title.textContent = task.title;

        info.appendChild(title);

        if (task.date) {
            const date = document.createElement("span");
            date.className = "task-date";

            if (isOverdue(task)) {
                date.classList.add("overdue");
                date.textContent = formatDate(task.date) +
                    " · Terlambat";
            } else {
                date.textContent = formatDate(task.date);
            }

            info.appendChild(date);
        }

        main.append(checkbox, info);

        const actions = document.createElement("div");
        actions.className = "task-actions";

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "icon-button";
        deleteButton.textContent = "×";
        deleteButton.setAttribute(
            "aria-label",
            "Hapus tugas " + task.title
        );
        deleteButton.title = "Hapus tugas";

        deleteButton.addEventListener("click", () => {
            deleteTask(task.id);
        });

        actions.appendChild(deleteButton);
        item.append(main, actions);
        taskList.appendChild(item);
    });

    emptyState.hidden = filteredTasks.length !== 0;

    if (tasks.length === 0) {
        emptyState.querySelector("h3").textContent = "Belum ada tugas";
        emptyState.querySelector("p").textContent =
            "Tambahkan tugas pertamamu dan mulai produktif!";
    } else if (filteredTasks.length === 0) {
        emptyState.querySelector("h3").textContent =
            "Tidak ada tugas di sini";
        emptyState.querySelector("p").textContent =
            "Coba pilih filter yang berbeda.";
    }

    updateStats();
}

function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = total - completed;

    const percentage = total === 0
        ? 0
        : Math.round((completed / total) * 100);

    totalTasks.textContent = total;
    pendingTasks.textContent = pending;
    completedTasks.textContent = completed;
    taskCount.textContent = `(${total})`;
    progressText.textContent = percentage + "%";
    progressFill.style.width = percentage + "%";
    progressBar.setAttribute("aria-valuenow", percentage);
    footerText.textContent = `${pending} tugas tersisa`;

    clearCompleted.disabled = completed === 0;
    clearCompleted.style.opacity = completed === 0 ? "0.45" : "1";
}

function addTask(title, date) {
    const task = {
        id: crypto.randomUUID
            ? crypto.randomUUID()
            : Date.now().toString() + Math.random().toString(36),
        title,
        date,
        completed: false,
        createdAt: new Date().toISOString()
    };

    tasks.unshift(task);

    if (!saveTasks()) {
        tasks.shift();
        return;
    }

    currentFilter = "all";
    updateFilters();
    renderTasks();
    showToast("Tugas berhasil ditambahkan!");
}

function toggleTask(id) {
    const task = tasks.find(task => task.id === id);
    if (!task) return;

    task.completed = !task.completed;

    if (!saveTasks()) {
        task.completed = !task.completed;
        return;
    }

    renderTasks();

    showToast(
        task.completed
            ? "Mantap! Tugas selesai 🎉"
            : "Tugas ditandai belum selesai."
    );
}

function deleteTask(id) {
    const index = tasks.findIndex(task => task.id === id);
    if (index === -1) return;

    const removedTask = tasks.splice(index, 1)[0];

    if (!saveTasks()) {
        tasks.splice(index, 0, removedTask);
        return;
    }

    renderTasks();
    showToast("Tugas berhasil dihapus.");
}

function updateFilters() {
    document.querySelectorAll(".filter").forEach(button => {
        const active = button.dataset.filter === currentFilter;

        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });
}


taskForm.addEventListener("submit", event => {
    event.preventDefault();

    const title = taskInput.value.trim();
    const date = taskDate.value;
    const time = taskTime.value;

    if (!title) {
        showToast("Nama tugas tidak boleh kosong.");
        taskInput.focus();
        return;
    }

    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        showToast("Tanggal tenggat tidak valid.");
        return;
    }

    addTask(title, date, time);
    taskForm.reset();
    taskInput.focus();
});


document.querySelectorAll(".filter").forEach(button => {
    button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;
        updateFilters();
        renderTasks();
    });
});

clearCompleted.addEventListener("click", () => {
    const previousTasks = tasks;
    tasks = tasks.filter(task => !task.completed);

    if (!saveTasks()) {
        tasks = previousTasks;
        return;
    }

    renderTasks();
    showToast("Semua tugas selesai telah dihapus.");
});

renderTasks();
updateFilters();

const STORAGE_KEY = "taskly-tasks-v1";

const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const taskDate = document.getElementById("taskDate");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const toast = document.getElementById("toast");

const totalTasks = document.getElementById("totalTasks");
const pendingTasks = document.getElementById("pendingTasks");
const completedTasks = document.getElementById("completedTasks");
const taskCount = document.getElementById("taskCount");
const progressText = document.getElementById("progressText");
const progressBar = document.getElementById("progressBar");
const progressFill = document.getElementById("progressFill");
const footerText = document.getElementById("footerText");
const clearCompleted = document.getElementById("clearCompleted");

let tasks = loadTasks();
let currentFilter = "all";
let toastTimeout;

function loadTasks() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : [];

        if (!Array.isArray(parsed)) return [];

        return parsed.filter(task =>
            task &&
            typeof task.id === "string" &&
            typeof task.title === "string" &&
            typeof task.completed === "boolean" &&
            typeof task.date === "string"
        );
    } catch (error) {
        console.error("Gagal membaca tugas:", error);
        return [];
    }
}

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return true;
    } catch (error) {
        console.error("Gagal menyimpan tugas:", error);
        showToast("Penyimpanan gagal. Periksa browser kamu.");
        return false;
    }
}

function showToast(message) {
    clearTimeout(toastTimeout);

    toast.textContent = message;
    toast.classList.add("show");

    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

function formatDate(dateString) {
    if (!dateString) return "";

    const parts = dateString.split("-").map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);

    return "Tenggat: " + date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function isOverdue(task) {
    if (!task.date || task.completed) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadline = new Date(task.date + "T00:00:00");

    return deadline < today;
}

function renderTasks() {
    taskList.replaceChildren();

    const filteredTasks = tasks.filter(task => {
        if (currentFilter === "pending") {
            return !task.completed;
        }

        if (currentFilter === "completed") {
            return task.completed;
        }

        return true;
    });

    filteredTasks.forEach(task => {
        const item = document.createElement("article");
        item.className = "task-item" +
            (task.completed ? " done" : "");

        const main = document.createElement("div");
        main.className = "task-main";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "task-check";
        checkbox.checked = task.completed;
        checkbox.setAttribute(
            "aria-label",
            "Tandai " + task.title + " selesai"
        );

        checkbox.addEventListener("change", () => {
            toggleTask(task.id);
        });

        const info = document.createElement("div");
        info.className = "task-info";

        const title = document.createElement("p");
        title.className = "task-title";
        title.textContent = task.title;

        info.appendChild(title);

        if (task.date) {
            const date = document.createElement("span");
            date.className = "task-date";

            if (isOverdue(task)) {
                date.classList.add("overdue");
                date.textContent = formatDate(task.date) +
                    " · Terlambat";
            } else {
                date.textContent = formatDate(task.date);
            }

            info.appendChild(date);
        }

        main.append(checkbox, info);

        const actions = document.createElement("div");
        actions.className = "task-actions";

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "icon-button";
        deleteButton.textContent = "×";
        deleteButton.setAttribute(
            "aria-label",
            "Hapus tugas " + task.title
        );
        deleteButton.title = "Hapus tugas";

        deleteButton.addEventListener("click", () => {
            deleteTask(task.id);
        });

        actions.appendChild(deleteButton);
        item.append(main, actions);
        taskList.appendChild(item);
    });

    emptyState.hidden = filteredTasks.length !== 0;

    if (tasks.length === 0) {
        emptyState.querySelector("h3").textContent = "Belum ada tugas";
        emptyState.querySelector("p").textContent =
            "Tambahkan tugas pertamamu dan mulai produktif!";
    } else if (filteredTasks.length === 0) {
        emptyState.querySelector("h3").textContent =
            "Tidak ada tugas di sini";
        emptyState.querySelector("p").textContent =
            "Coba pilih filter yang berbeda.";
    }

    updateStats();
}

function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = total - completed;

    const percentage = total === 0
        ? 0
        : Math.round((completed / total) * 100);

    totalTasks.textContent = total;
    pendingTasks.textContent = pending;
    completedTasks.textContent = completed;
    taskCount.textContent = `(${total})`;
    progressText.textContent = percentage + "%";
    progressFill.style.width = percentage + "%";
    progressBar.setAttribute("aria-valuenow", percentage);
    footerText.textContent = `${pending} tugas tersisa`;

    clearCompleted.disabled = completed === 0;
    clearCompleted.style.opacity = completed === 0 ? "0.45" : "1";
}

function addTask(title, date) {
    const task = {
        id: crypto.randomUUID
            ? crypto.randomUUID()
            : Date.now().toString() + Math.random().toString(36),
        title,
        date,
        completed: false,
        createdAt: new Date().toISOString()
    };

    tasks.unshift(task);

    if (!saveTasks()) {
        tasks.shift();
        return;
    }

    currentFilter = "all";
    updateFilters();
    renderTasks();
    showToast("Tugas berhasil ditambahkan!");
}

function toggleTask(id) {
    const task = tasks.find(task => task.id === id);
    if (!task) return;

    task.completed = !task.completed;

    if (!saveTasks()) {
        task.completed = !task.completed;
        return;
    }

    renderTasks();

    showToast(
        task.completed
            ? "Mantap! Tugas selesai 🎉"
            : "Tugas ditandai belum selesai."
    );
}

function deleteTask(id) {
    const index = tasks.findIndex(task => task.id === id);
    if (index === -1) return;

    const removedTask = tasks.splice(index, 1)[0];

    if (!saveTasks()) {
        tasks.splice(index, 0, removedTask);
        return;
    }

    renderTasks();
    showToast("Tugas berhasil dihapus.");
}

function updateFilters() {
    document.querySelectorAll(".filter").forEach(button => {
        const active = button.dataset.filter === currentFilter;

        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });
}

taskForm.addEventListener("submit", event => {
    event.preventDefault();

    const title = taskInput.value.trim();
    const date = taskDate.value;

    if (!title) {
        showToast("Nama tugas tidak boleh kosong.");
        taskInput.focus();
        return;
    }

    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        showToast("Tanggal tenggat tidak valid.");
        return;
    }

    addTask(title, date);

    if (tasks.some(task => task.title === title &&
        task.date === date && !task.completed)) {
        taskForm.reset();
        taskInput.focus();
    }
});

document.querySelectorAll(".filter").forEach(button => {
    button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;
        updateFilters();
        renderTasks();
    });
});

clearCompleted.addEventListener("click", () => {
    const previousTasks = tasks;
    tasks = tasks.filter(task => !task.completed);

    if (!saveTasks()) {
        tasks = previousTasks;
        return;
    }

    renderTasks();
    showToast("Semua tugas selesai telah dihapus.");
});

renderTasks();
updateFilters();
