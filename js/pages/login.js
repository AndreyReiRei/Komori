/**
 * Функционал страницы авторизации и регистрации
 * Сайт "Комори" - азиатский магазинчик
 */

class AuthPage {
	constructor() {
		// Загружаем список пользователей из store или localStorage
		this.users = this.loadUsers();
		this.init();
	}

	// ========== ЗАГРУЗКА И СОХРАНЕНИЕ ПОЛЬЗОВАТЕЛЕЙ ==========

	/**
	 * Загрузка пользователей из store или localStorage
	 */
	loadUsers() {
		// Сначала пробуем получить из store (если он уже инициализирован)
		if ( window.store && window.store.users && window.store.users.length > 0 ) {
			return window.store.users;
		}

		// Если store пуст, загружаем из localStorage
		const savedUsers = localStorage.getItem( 'komori_users' );
		const users = savedUsers ? JSON.parse( savedUsers ) : [];

		// Если store существует, синхронизируем с ним
		if ( window.store && window.store.users ) {
			window.store.users = users;
			window.store.saveToStorage();
		}

		return users;
	}

	/**
	 * Сохранение пользователей в store и localStorage
	 */
	saveUsers() {
		localStorage.setItem( 'komori_users', JSON.stringify( this.users ) );

		// Синхронизируем с store
		if ( window.store ) {
			window.store.users = this.users;
			window.store.saveToStorage();
		}
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

		if ( authText ) {
			authText.textContent = user.name;
		}

		if ( authBtn ) {
			authBtn.href = '/pages html/profile.html';
		}

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
		this.bindRecoveryTab();
		this.checkUrlParams();
		this.checkAuthStatus();
	}

	/**
	 * Переключение между вкладками
	 */
	bindTabs() {
		const loginTab = document.getElementById( 'loginTab' );
		const registerTab = document.getElementById( 'registerTab' );
		const recoveryTab = document.getElementById( 'recoveryTab' );
		const loginForm = document.getElementById( 'loginForm' );
		const registerForm = document.getElementById( 'registerForm' );
		const recoveryForm = document.getElementById( 'recoveryForm' );
		const switchToRegister = document.getElementById( 'switchToRegisterMobile' );
		const switchToLogin = document.getElementById( 'switchToLoginMobile' );

		// Функция переключения на вкладку входа
		const showLoginTab = () => {
			if ( loginTab ) loginTab.classList.add( 'active' );
			if ( registerTab ) registerTab.classList.remove( 'active' );
			if ( recoveryTab ) recoveryTab.classList.remove( 'active' );
			if ( loginForm ) loginForm.classList.add( 'active' );
			if ( registerForm ) registerForm.classList.remove( 'active' );
			if ( recoveryForm ) recoveryForm.classList.remove( 'active' );
			this.clearErrors();
		};

		// Функция переключения на вкладку регистрации
		const showRegisterTab = () => {
			if ( registerTab ) registerTab.classList.add( 'active' );
			if ( loginTab ) loginTab.classList.remove( 'active' );
			if ( recoveryTab ) recoveryTab.classList.remove( 'active' );
			if ( registerForm ) registerForm.classList.add( 'active' );
			if ( loginForm ) loginForm.classList.remove( 'active' );
			if ( recoveryForm ) recoveryForm.classList.remove( 'active' );
			this.clearErrors();
		};

		// Функция переключения на вкладку восстановления
		const showRecoveryTab = () => {
			if ( recoveryTab ) recoveryTab.classList.add( 'active' );
			if ( loginTab ) loginTab.classList.remove( 'active' );
			if ( registerTab ) registerTab.classList.remove( 'active' );
			if ( recoveryForm ) recoveryForm.classList.add( 'active' );
			if ( loginForm ) loginForm.classList.remove( 'active' );
			if ( registerForm ) registerForm.classList.remove( 'active' );
			this.clearErrors();
		};

		if ( loginTab ) loginTab.addEventListener( 'click', showLoginTab );
		if ( registerTab ) registerTab.addEventListener( 'click', showRegisterTab );
		if ( recoveryTab ) recoveryTab.addEventListener( 'click', showRecoveryTab );

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

		// Ссылка "Вернуться ко входу" на вкладке восстановления
		const backToLogin = document.getElementById( 'backToLogin' );
		if ( backToLogin ) {
			backToLogin.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				showLoginTab();
			} );
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
		const recoveryForm = document.getElementById( 'recoveryFormElement' );

		if ( loginForm ) {
			loginForm.addEventListener( 'submit', ( e ) => this.handleLogin( e ) );
		}

		if ( registerForm ) {
			registerForm.addEventListener( 'submit', ( e ) => this.handleRegister( e ) );
		}

		if ( recoveryForm ) {
			recoveryForm.addEventListener( 'submit', ( e ) => this.handleForgotPassword( e ) );
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
	 * Обработка восстановления пароля (старое модальное окно)
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

		const closeModal = document.querySelector( '#forgotPasswordModal .close-modal' );
		if ( closeModal && modal ) {
			closeModal.addEventListener( 'click', () => {
				modal.style.display = 'none';
			} );
		}
	}

	/**
	 * Обработка вкладки восстановления пароля
	 */
	bindRecoveryTab() {
		const recoveryForm = document.getElementById( 'recoveryFormElement' );
		if ( recoveryForm ) {
			// Обработчик уже добавлен в bindForms
		}
	}

	/**
	 * Проверка параметров URL
	 */
	checkUrlParams() {
		const urlParams = new URLSearchParams( window.location.search );
		const tab = urlParams.get( 'tab' );

		if ( tab === 'register' ) {
			const registerTab = document.getElementById( 'registerTab' );
			if ( registerTab ) registerTab.click();
		} else if ( tab === 'recovery' ) {
			const recoveryTab = document.getElementById( 'recoveryTab' );
			if ( recoveryTab ) recoveryTab.click();
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

		// Валидация поля ввода
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
			// ВАЖНО: Сначала обновляем список пользователей из store
			this.syncUsersFromStore();

			const user = this.users.find( u =>
				( u.email === identifier.value || u.phone === identifier.value ) &&
				u.password === password.value
			);

			if ( user ) {
				this.showNotification( 'Вход выполнен успешно!', 'success' );

				localStorage.setItem( 'komori_current_user', JSON.stringify( user ) );

				if ( user.avatar ) {
					localStorage.setItem( 'komori_current_avatar', user.avatar );
				}

				if ( rememberMe && rememberMe.checked ) {
					localStorage.setItem( 'komori_remembered_user', JSON.stringify( user ) );
				}

				// Обновляем счетчики в шапке
				if ( window.API && window.API.updateHeaderCounters ) {
					window.API.updateHeaderCounters();
				}

				// Отправляем событие об обновлении пользователя
				window.dispatchEvent( new CustomEvent( 'userUpdated' ) );

				setTimeout( () => {
					window.location.href = '/index.html';
				}, 1500 );
			} else {
				this.showNotification( 'Неверный email/телефон или пароль', 'error' );
			}
		}
	}

	/**
	 * Синхронизация пользователей из store
	 */
	syncUsersFromStore() {
		if ( window.store && window.store.users ) {
			this.users = window.store.users;
		} else {
			const savedUsers = localStorage.getItem( 'komori_users' );
			if ( savedUsers ) {
				this.users = JSON.parse( savedUsers );
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
		const cleanPhone = phone.value.replace( /\s/g, '' );
		if ( !phone.value.trim() ) {
			this.showError( 'registerPhoneError', 'Введите номер телефона' );
			phone.classList.add( 'error' );
			isValid = false;
		} else if ( !phoneRegex.test( cleanPhone ) ) {
			this.showError( 'registerPhoneError', 'Введите корректный номер телефона' );
			phone.classList.add( 'error' );
			isValid = false;
		} else if ( this.users.some( u => u.phone === cleanPhone ) ) {
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
			const newUser = {
				id: Date.now(),
				name: name.value.trim(),
				email: email.value.trim(),
				phone: cleanPhone,
				password: password.value,
				subscribe: subscribe.checked,
				avatar: null,
				addresses: [],
				defaultAddressId: null,
				defaultAddress: null,
				createdAt: new Date().toISOString(),
				lastLogin: null
			};

			this.users.push( newUser );
			this.saveUsers();

			this.showNotification( 'Регистрация прошла успешно!', 'success' );

			setTimeout( () => {
				window.location.href = '/pages html/login.html?tab=login';
			}, 1500 );
		}
	}

	/**
	 * Обработка восстановления пароля (новая вкладка)
	 */
	handleForgotPassword( e ) {
		e.preventDefault();

		const emailInput = document.getElementById( 'recoveryEmail' );
		const submitBtn = document.getElementById( 'recoverySubmitBtn' );

		if ( !emailInput || !emailInput.value.trim() ) {
			this.showError( 'recoveryEmailError', 'Введите email' );
			if ( emailInput ) emailInput.classList.add( 'error' );
			return;
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if ( !emailRegex.test( emailInput.value ) ) {
			this.showError( 'recoveryEmailError', 'Введите корректный email' );
			emailInput.classList.add( 'error' );
			return;
		}

		this.clearError( 'recoveryEmailError' );
		emailInput.classList.remove( 'error' );

		if ( submitBtn ) {
			submitBtn.disabled = true;
			submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
		}

		setTimeout( () => {
			// Синхронизируем пользователей перед поиском
			this.syncUsersFromStore();

			const user = this.users.find( u => u.email === emailInput.value );

			if ( user ) {
				// Генерируем временный пароль
				const tempPassword = this.generateTempPassword();

				// Обновляем пароль пользователя
				user.password = tempPassword;
				this.saveUsers();

				// Показываем сообщение с временным паролем
				this.showNotification( `Новый пароль отправлен на ${user.email}`, 'success' );

				// В реальном приложении здесь была бы отправка email
				console.log( `Временный пароль для ${user.email}: ${tempPassword}` );

				// Очищаем поле email
				emailInput.value = '';

				// Переключаемся на вкладку входа
				setTimeout( () => {
					const loginTab = document.getElementById( 'loginTab' );
					if ( loginTab ) loginTab.click();
				}, 2000 );
			} else {
				this.showError( 'recoveryEmailError', 'Пользователь с таким email не найден' );
				emailInput.classList.add( 'error' );
			}

			if ( submitBtn ) {
				submitBtn.disabled = false;
				submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Отправить инструкцию';
			}
		}, 1500 );
	}

	/**
	 * Генерация временного пароля
	 */
	generateTempPassword() {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
		let password = '';
		for ( let i = 0; i < 10; i++ ) {
			password += chars.charAt( Math.floor( Math.random() * chars.length ) );
		}
		return password;
	}

	// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

	/**
	 * Проверка сложности пароля
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

		if ( password.length >= 8 ) strength++;
		if ( password.length >= 12 ) strength++;
		if ( /\d/.test( password ) ) strength++;
		if ( /[a-z]/.test( password ) && /[A-Z]/.test( password ) ) strength++;
		if ( /[!@#$%^&*(),.?":{}|<>]/.test( password ) ) strength++;

		strength = Math.min( strength, 3 );

		bars.forEach( ( bar, index ) => {
			bar.classList.remove( 'weak', 'medium', 'strong' );

			if ( index < strength ) {
				if ( strength === 1 ) bar.classList.add( 'weak' );
				else if ( strength === 2 ) bar.classList.add( 'medium' );
				else if ( strength >= 3 ) bar.classList.add( 'strong' );
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