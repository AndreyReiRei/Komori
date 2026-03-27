/**
 * Функционал страницы авторизации и регистрации
 * Сайт "Комори" - азиатский магазинчик
 */

class AuthPage {
	constructor() {
		// Загружаем список пользователей из localStorage
		this.users = this.loadUsers();
		this.init();
	}

	// ========== ЗАГРУЗКА И СОХРАНЕНИЕ ПОЛЬЗОВАТЕЛЕЙ ==========

	/**
	 * Загрузка пользователей из localStorage
	 */
	loadUsers() {
		const savedUsers = localStorage.getItem( 'komori_users' );
		return savedUsers ? JSON.parse( savedUsers ) : [];
	}

	/**
	 * Сохранение пользователей в localStorage
	 */
	saveUsers() {
		localStorage.setItem( 'komori_users', JSON.stringify( this.users ) );
	}

	/**
	 * Проверка авторизации при загрузке страницы
	 */
	checkAuthStatus() {
		const currentUser = localStorage.getItem( 'komori_current_user' );
		if ( currentUser ) {
			const user = JSON.parse( currentUser );
			this.updateUIForLoggedInUser( user );
		}
	}

	/**
	 * Обновление интерфейса для авторизованного пользователя
	 * @param {Object} user - объект пользователя
	 */
	updateUIForLoggedInUser( user ) {
		const authText = document.getElementById( 'authText' );
		const authBtn = document.getElementById( 'authBtn' );
		const headerAvatar = document.getElementById( 'headerAvatar' );
		const headerAvatarIcon = document.getElementById( 'headerAvatarIcon' );

		// Меняем текст кнопки на имя пользователя
		if ( authText ) {
			authText.textContent = user.name;
		}

		// Меняем ссылку на страницу профиля
		if ( authBtn ) {
			authBtn.href = '/pages html/profile.html';
		}

		// Отображаем аватар в шапке, если он есть
		if ( headerAvatar && headerAvatarIcon ) {
			if ( user.avatar ) {
				headerAvatar.src = user.avatar;
				headerAvatar.style.display = 'block';
				headerAvatarIcon.style.display = 'none';
			} else {
				headerAvatar.style.display = 'none';
				headerAvatarIcon.style.display = 'block';
			}
		}
	}

	// ========== ИНИЦИАЛИЗАЦИЯ ==========

	/**
	 * Инициализация страницы
	 */
	init() {
		this.bindTabs();
		this.bindPasswordToggles();
		this.bindForms();
		this.bindPasswordStrength();
		this.bindForgotPassword();
		this.checkUrlParams();
		this.checkAuthStatus(); // Проверяем, авторизован ли пользователь
	}

	/**
	 * Переключение между вкладками "Вход" и "Регистрация"
	 */
	bindTabs() {
		// Получаем элементы вкладок и форм
		const loginTab = document.getElementById( 'loginTab' );
		const registerTab = document.getElementById( 'registerTab' );
		const loginForm = document.getElementById( 'loginForm' );
		const registerForm = document.getElementById( 'registerForm' );
		const switchToRegister = document.getElementById( 'switchToRegisterMobile' );
		const switchToLogin = document.getElementById( 'switchToLoginMobile' );

		console.log( 'Найдены элементы:', { loginTab, registerTab, loginForm, registerForm } );

		if ( loginTab && registerTab && loginForm && registerForm ) {

			// Функция переключения на вкладку входа
			const showLoginTab = () => {
				console.log( 'Переключение на вкладку Входа' );
				loginTab.classList.add( 'active' );
				registerTab.classList.remove( 'active' );
				loginForm.classList.add( 'active' );
				registerForm.classList.remove( 'active' );
				this.clearErrors();
			};

			// Функция переключения на вкладку регистрации
			const showRegisterTab = () => {
				console.log( 'Переключение на вкладку Регистрации' );
				registerTab.classList.add( 'active' );
				loginTab.classList.remove( 'active' );
				registerForm.classList.add( 'active' );
				loginForm.classList.remove( 'active' );
				this.clearErrors();
			};

			// Добавляем обработчики событий
			loginTab.addEventListener( 'click', showLoginTab );
			registerTab.addEventListener( 'click', showRegisterTab );

			// Мобильные переключатели
			if ( switchToRegister ) {
				switchToRegister.addEventListener( 'click', ( e ) => {
					e.preventDefault();
					showRegisterTab();
				} );
			}

			if ( switchToLogin ) {
				switchToLogin.addEventListener( 'click', ( e ) => {
					e.preventDefault();
					showLoginTab();
				} );
			}
		} else {
			console.error( 'Не найдены элементы вкладок:', { loginTab, registerTab, loginForm, registerForm } );
		}
	}

	/**
	 * Переключение видимости пароля (глазик)
	 */
	bindPasswordToggles() {
		document.querySelectorAll( '.password-toggle' ).forEach( btn => {
			btn.addEventListener( 'click', function () {
				const input = this.previousElementSibling;
				const type = input.getAttribute( 'type' ) === 'password' ? 'text' : 'password';
				input.setAttribute( 'type', type );
				this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
			} );
		} );
	}

	/**
	 * Привязка обработчиков отправки форм
	 */
	bindForms() {
		const loginForm = document.getElementById( 'loginFormElement' );
		const registerForm = document.getElementById( 'registerFormElement' );

		if ( loginForm ) {
			loginForm.addEventListener( 'submit', ( e ) => this.handleLogin( e ) );
		}

		if ( registerForm ) {
			registerForm.addEventListener( 'submit', ( e ) => this.handleRegister( e ) );
		}
	}

	/**
	 * Проверка сложности пароля в реальном времени
	 */
	bindPasswordStrength() {
		const passwordInput = document.getElementById( 'registerPassword' );
		if ( passwordInput ) {
			passwordInput.addEventListener( 'input', () => this.checkPasswordStrength( passwordInput.value ) );
		}

		const confirmInput = document.getElementById( 'registerConfirmPassword' );
		if ( confirmInput ) {
			confirmInput.addEventListener( 'input', () => this.checkPasswordMatch() );
		}
	}

	/**
	 * Обработка восстановления пароля
	 */
	bindForgotPassword() {
		const forgotBtn = document.getElementById( 'forgotPasswordBtn' );
		const modal = document.getElementById( 'forgotPasswordModal' );

		if ( forgotBtn && modal ) {
			forgotBtn.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				modal.style.display = 'flex';
			} );
		}

		// Закрытие модального окна
		const closeModal = document.querySelector( '#forgotPasswordModal .close-modal' );
		if ( closeModal && modal ) {
			closeModal.addEventListener( 'click', () => {
				modal.style.display = 'none';
			} );
		}

		// Обработка формы восстановления
		const forgotForm = document.getElementById( 'forgotPasswordForm' );
		if ( forgotForm ) {
			forgotForm.addEventListener( 'submit', ( e ) => this.handleForgotPassword( e ) );
		}
	}

	/**
	 * Проверка параметров URL (для автоматического переключения на регистрацию)
	 */
	checkUrlParams() {
		const urlParams = new URLSearchParams( window.location.search );
		const tab = urlParams.get( 'tab' );

		if ( tab === 'register' ) {
			const registerTab = document.getElementById( 'registerTab' );
			if ( registerTab ) registerTab.click();
		}
	}

	// ========== ОБРАБОТКА ФОРМ ==========

	/**
	 * Обработка входа пользователя
	 */
	handleLogin( e ) {
		e.preventDefault();

		const identifier = document.getElementById( 'loginIdentifier' );
		const password = document.getElementById( 'loginPassword' );
		const rememberMe = document.getElementById( 'rememberMe' );

		let isValid = true;

		// Валидация поля ввода (email/телефон)
		if ( !identifier.value.trim() ) {
			this.showError( 'loginIdentifierError', 'Введите email или номер телефона' );
			identifier.classList.add( 'error' );
			isValid = false;
		} else {
			this.clearError( 'loginIdentifierError' );
			identifier.classList.remove( 'error' );
		}

		// Валидация пароля
		if ( !password.value ) {
			this.showError( 'loginPasswordError', 'Введите пароль' );
			password.classList.add( 'error' );
			isValid = false;
		} else if ( password.value.length < 6 ) {
			this.showError( 'loginPasswordError', 'Пароль должен содержать минимум 6 символов' );
			password.classList.add( 'error' );
			isValid = false;
		} else {
			this.clearError( 'loginPasswordError' );
			password.classList.remove( 'error' );
		}

		if ( isValid ) {
			// Поиск пользователя в базе
			const user = this.users.find( u =>
				( u.email === identifier.value || u.phone === identifier.value ) &&
				u.password === password.value
			);

			if ( user ) {
				this.showNotification( 'Вход выполнен успешно!', 'success' );

				// Сохраняем текущего пользователя
				localStorage.setItem( 'komori_current_user', JSON.stringify( user ) );

				// Сохраняем аватар в отдельное хранилище для быстрого доступа
				if ( user.avatar ) {
					localStorage.setItem( 'komori_current_avatar', user.avatar );
				}

				// Если отмечено "Запомнить меня"
				if ( rememberMe && rememberMe.checked ) {
					localStorage.setItem( 'komori_remembered_user', JSON.stringify( user ) );
				}

				// Перенаправление на главную страницу
				setTimeout( () => {
					window.location.href = '/index.html';
				}, 1500 );
			} else {
				this.showNotification( 'Неверный email/телефон или пароль', 'error' );
				const submitBtn = document.getElementById( 'loginSubmitBtn' );
				if ( submitBtn ) {
					submitBtn.disabled = false;
					submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
				}
			}
		}
	}

	/**
	 * Обработка регистрации нового пользователя
	 */
	handleRegister( e ) {
		e.preventDefault();

		const name = document.getElementById( 'registerName' );
		const email = document.getElementById( 'registerEmail' );
		const phone = document.getElementById( 'registerPhone' );
		const password = document.getElementById( 'registerPassword' );
		const confirm = document.getElementById( 'registerConfirmPassword' );
		const agree = document.getElementById( 'agreeTerms' );
		const subscribe = document.getElementById( 'subscribeNews' );

		let isValid = true;

		// Валидация имени
		if ( !name.value.trim() ) {
			this.showError( 'registerNameError', 'Введите ваше имя' );
			name.classList.add( 'error' );
			isValid = false;
		} else if ( name.value.trim().length < 2 ) {
			this.showError( 'registerNameError', 'Имя должно содержать минимум 2 символа' );
			name.classList.add( 'error' );
			isValid = false;
		} else {
			this.clearError( 'registerNameError' );
			name.classList.remove( 'error' );
		}

		// Валидация email
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if ( !email.value.trim() ) {
			this.showError( 'registerEmailError', 'Введите email' );
			email.classList.add( 'error' );
			isValid = false;
		} else if ( !emailRegex.test( email.value ) ) {
			this.showError( 'registerEmailError', 'Введите корректный email' );
			email.classList.add( 'error' );
			isValid = false;
		} else if ( this.users.some( u => u.email === email.value ) ) {
			this.showError( 'registerEmailError', 'Этот email уже зарегистрирован' );
			email.classList.add( 'error' );
			isValid = false;
		} else {
			this.clearError( 'registerEmailError' );
			email.classList.remove( 'error' );
		}

		// Валидация телефона
		const phoneRegex = /^(\+7|7|8)?[\s\-]?\(?[0-9]{3}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/;
		if ( !phone.value.trim() ) {
			this.showError( 'registerPhoneError', 'Введите номер телефона' );
			phone.classList.add( 'error' );
			isValid = false;
		} else if ( !phoneRegex.test( phone.value.replace( /\s/g, '' ) ) ) {
			this.showError( 'registerPhoneError', 'Введите корректный номер телефона' );
			phone.classList.add( 'error' );
			isValid = false;
		} else if ( this.users.some( u => u.phone === phone.value ) ) {
			this.showError( 'registerPhoneError', 'Этот телефон уже зарегистрирован' );
			phone.classList.add( 'error' );
			isValid = false;
		} else {
			this.clearError( 'registerPhoneError' );
			phone.classList.remove( 'error' );
		}

		// Валидация пароля
		if ( !password.value ) {
			this.showError( 'registerPasswordError', 'Введите пароль' );
			password.classList.add( 'error' );
			isValid = false;
		} else if ( password.value.length < 8 ) {
			this.showError( 'registerPasswordError', 'Пароль должен содержать минимум 8 символов' );
			password.classList.add( 'error' );
			isValid = false;
		} else {
			this.clearError( 'registerPasswordError' );
			password.classList.remove( 'error' );
		}

		// Проверка совпадения паролей
		if ( password.value !== confirm.value ) {
			this.showError( 'registerConfirmError', 'Пароли не совпадают' );
			confirm.classList.add( 'error' );
			isValid = false;
		} else {
			this.clearError( 'registerConfirmError' );
			confirm.classList.remove( 'error' );
		}

		// Проверка согласия с правилами
		if ( !agree.checked ) {
			this.showNotification( 'Необходимо согласиться с правилами сайта', 'error' );
			isValid = false;
		}

		if ( isValid ) {
			// Создаем нового пользователя
			const newUser = {
				id: Date.now(),
				name: name.value.trim(),
				email: email.value.trim(),
				phone: phone.value.trim(),
				password: password.value,
				subscribe: subscribe.checked,
				avatar: null, // Аватар пока пустой
				createdAt: new Date().toISOString()
			};

			this.users.push( newUser );
			this.saveUsers();

			this.showNotification( 'Регистрация прошла успешно!', 'success' );

			// Перенаправление на страницу входа
			setTimeout( () => {
				window.location.href = '/pages html/login.html?tab=login';
			}, 1500 );
		}
	}

	/**
	 * Обработка восстановления пароля
	 */
	handleForgotPassword( e ) {
		e.preventDefault();

		const identifier = document.getElementById( 'forgotIdentifier' );

		if ( !identifier.value.trim() ) {
			alert( 'Введите email или номер телефона' );
			return;
		}

		const submitBtn = e.target.querySelector( 'button[type="submit"]' );
		submitBtn.disabled = true;
		submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';

		setTimeout( () => {
			// Поиск пользователя
			const user = this.users.find( u => u.email === identifier.value || u.phone === identifier.value );

			if ( user ) {
				alert( `Инструкция по восстановлению пароля отправлена на ${user.email}` );
			} else {
				alert( 'Пользователь с таким email/телефоном не найден' );
			}

			const modal = document.getElementById( 'forgotPasswordModal' );
			if ( modal ) modal.style.display = 'none';

			submitBtn.disabled = false;
			submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Отправить инструкцию';

			document.getElementById( 'forgotIdentifier' ).value = '';
		}, 1500 );
	}

	// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

	/**
	 * Проверка сложности пароля (отображает полоски)
	 */
	checkPasswordStrength( password ) {
		const bars = document.querySelectorAll( '.strength-bar' );

		if ( !password ) {
			bars.forEach( bar => {
				bar.classList.remove( 'weak', 'medium', 'strong' );
			} );
			return;
		}

		let strength = 0;

		// Длина пароля
		if ( password.length >= 8 ) strength++;
		if ( password.length >= 10 ) strength++;

		// Наличие цифр
		if ( /\d/.test( password ) ) strength++;

		// Наличие букв в разных регистрах
		if ( /[a-z]/.test( password ) && /[A-Z]/.test( password ) ) strength++;

		// Наличие спецсимволов
		if ( /[!@#$%^&*(),.?":{}|<>]/.test( password ) ) strength++;

		// Ограничиваем до 3
		strength = Math.min( strength, 3 );

		bars.forEach( ( bar, index ) => {
			bar.classList.remove( 'weak', 'medium', 'strong' );

			if ( index < strength ) {
				if ( strength === 1 ) bar.classList.add( 'weak' );
				else if ( strength === 2 ) bar.classList.add( 'medium' );
				else if ( strength === 3 ) bar.classList.add( 'strong' );
			}
		} );
	}

	/**
	 * Проверка совпадения паролей
	 */
	checkPasswordMatch() {
		const password = document.getElementById( 'registerPassword' );
		const confirm = document.getElementById( 'registerConfirmPassword' );

		if ( confirm.value && password.value !== confirm.value ) {
			this.showError( 'registerConfirmError', 'Пароли не совпадают' );
			confirm.classList.add( 'error' );
		} else {
			this.clearError( 'registerConfirmError' );
			confirm.classList.remove( 'error' );
		}
	}

	/**
	 * Показать ошибку валидации
	 */
	showError( elementId, message ) {
		const errorElement = document.getElementById( elementId );
		if ( errorElement ) {
			errorElement.textContent = message;
		}
	}

	/**
	 * Очистить ошибку валидации
	 */
	clearError( elementId ) {
		const errorElement = document.getElementById( elementId );
		if ( errorElement ) {
			errorElement.textContent = '';
		}
	}

	/**
	 * Очистить все ошибки
	 */
	clearErrors() {
		document.querySelectorAll( '.input-error' ).forEach( el => el.textContent = '' );
		document.querySelectorAll( '.auth-input' ).forEach( el => el.classList.remove( 'error' ) );
	}

	/**
	 * Показать всплывающее уведомление
	 */
	showNotification( message, type = 'info' ) {
		let container = document.querySelector( '.notification-container' );

		if ( !container ) {
			container = document.createElement( 'div' );
			container.className = 'notification-container';
			document.body.appendChild( container );
		}

		const notification = document.createElement( 'div' );
		notification.className = `notification ${type}`;

		let icon = '';
		if ( type === 'success' ) icon = 'fa-check-circle';
		else if ( type === 'info' ) icon = 'fa-info-circle';
		else if ( type === 'error' ) icon = 'fa-exclamation-circle';

		notification.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;

		container.appendChild( notification );

		setTimeout( () => {
			notification.style.animation = 'fadeOut 0.3s ease forwards';
			setTimeout( () => notification.remove(), 300 );
		}, 3000 );
	}
}

// Инициализация при загрузке страницы
document.addEventListener( 'DOMContentLoaded', function () {
	window.authPage = new AuthPage();
	console.log( 'Страница авторизации инициализирована' );
} );