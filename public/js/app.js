class TodoApp {
    constructor() {
        this.todos = JSON.parse(localStorage.getItem('todos')) || [];
        this.filter = 'all';
        this.init();
    }

    init() {
        this.todoForm = document.getElementById('todoForm');
        this.todoInput = document.getElementById('todoInput');
        this.todoList = document.getElementById('todoList');
        this.enableNotificationsBtn = document.getElementById('enableNotifications');

        this.todoForm.addEventListener('submit', (e) => this.handleSubmit(e));
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFilter(e));
        });
        this.enableNotificationsBtn.addEventListener('click', () => this.enableNotifications());

        this.render();
        this.registerServiceWorker();
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/js/service-worker.js');
                console.log('ServiceWorker зарегистрирован:', registration);
            } catch (error) {
                console.error('Ошибка регистрации ServiceWorker:', error);
            }
        }
    }

    async enableNotifications() {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: 'YOUR_PUBLIC_VAPID_KEY'
                });
                
                // Отправка subscription на сервер
                await fetch('/api/subscribe', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(subscription)
                });

                this.enableNotificationsBtn.textContent = 'Уведомления включены';
                this.enableNotificationsBtn.disabled = true;
            }
        } catch (error) {
            console.error('Ошибка при включении уведомлений:', error);
        }
    }

    handleSubmit(e) {
        e.preventDefault();
        const text = this.todoInput.value.trim();
        if (text) {
            this.addTodo(text);
            this.todoInput.value = '';
        }
    }

    handleFilter(e) {
        const filter = e.target.dataset.filter;
        this.filter = filter;
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        this.render();
    }

    addTodo(text) {
        const todo = {
            id: Date.now(),
            text,
            completed: false,
            createdAt: new Date()
        };
        this.todos.push(todo);
        this.saveTodos();
        this.render();
        this.sendNotification('Новая задача добавлена: ' + text);
    }

    toggleTodo(id) {
        this.todos = this.todos.map(todo =>
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
        );
        this.saveTodos();
        this.render();
    }

    deleteTodo(id) {
        this.todos = this.todos.filter(todo => todo.id !== id);
        this.saveTodos();
        this.render();
    }

    saveTodos() {
        localStorage.setItem('todos', JSON.stringify(this.todos));
    }

    async sendNotification(message) {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            try {
                const registration = await navigator.serviceWorker.ready;
                await registration.showNotification('Умный список задач', {
                    body: message,
                    icon: '/icons/icon-192x192.png'
                });
            } catch (error) {
                console.error('Ошибка при отправке уведомления:', error);
            }
        }
    }

    render() {
        const filteredTodos = this.todos.filter(todo => {
            if (this.filter === 'active') return !todo.completed;
            if (this.filter === 'completed') return todo.completed;
            return true;
        });

        this.todoList.innerHTML = filteredTodos.map(todo => `
            <li class="todo-item ${todo.completed ? 'completed' : ''}">
                <input type="checkbox" ${todo.completed ? 'checked' : ''} 
                    onchange="todoApp.toggleTodo(${todo.id})">
                <span>${todo.text}</span>
                <button onclick="todoApp.deleteTodo(${todo.id})">×</button>
            </li>
        `).join('');
    }
}

const todoApp = new TodoApp(); 