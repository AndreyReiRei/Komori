/**
 * Функционал страницы авторизации и регистрации
 * Сайт "Комори" - азиатский магазинчик
 */

class AuthPage {
	constructor() {
		this.init();
	}

	init() {
		this.bindTabs();
		this.bindPasswordToggles();
		this.bindForms();
		this.bindPasswordStrength();
		this.bindForgotPassword();
		this.bindFaq();
		this.checkUrlParams();
	}

	bindTabs() {
		const loginTab = document.getElementById( 'loginTab' );
		const registerTab = document.getElementById( 'registerTab' );
		const loginForm = document.getElementById( 'loginForm' );
		const registerForm = document.getElementById( 'registerForm' );
		const switchToRegister = document.getElementById( 'switchToRegisterMobile' );
		const switchToLogin = document.getElementById( 'switchToLoginMobile' );

		if ( loginTab && registerTab && loginForm && registerForm ) {
			loginTab.addEventListener( 'click', () => {
				loginTab.classList.add( 'active' );
				registerTab.classList.remove( 'active' );
				loginForm.classList.add( 'active' );
				registerForm.classList.remove( 'active' );
				this.clearErrors();
			} );

			registerTab.addEventListener( 'click', () => {
				registerTab.classList.add( 'active' );
				loginTab.classList.remove( 'active' );
				registerForm.classList.add( 'active' );
				loginForm.classList.remove( 'active' );
				this.clearErrors();
			} );

			if ( switchToRegister ) {
				switchToRegister.addEventListener( 'click', ( e ) => {
					e.preventDefault();
					registerTab.click();
				} );
			}

			if ( switchToLogin ) {
				switchToLogin.addEventListener( 'click', ( e ) => {
					e.preventDefault();
					loginTab.click();
				} );
			}
		}
	}

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

	bindForgotPassword() {
		const forgotBtn = document.getElementById( 'forgotPasswordBtn' );
		const modal = document.getElementById( 'forgotPasswordModal' );
		const closeBtn = modal.querySelector( '.close-modal' );
		const backToLogin = document.getElementById( 'backToLogin' );
		const forgotForm = document.getElementById( 'forgotPasswordForm' );

		if ( forgotBtn && modal ) {
			forgotBtn.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				modal.style.display = 'block';
			} );
		}

		if ( closeBtn && modal ) {
			closeBtn.addEventListener( 'click', () => {
				modal.style.display = 'none';
			} );
		}

		if ( backToLogin && modal ) {
			backToLogin.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				modal.style.display = 'none';
			} );
		}

		window.addEventListener( 'click', ( e ) => {
			if ( e.target === modal ) {
				modal.style.display = 'none';
			}
		} );

		if ( forgotForm ) {
			forgotForm.addEventListener( 'submit', ( e ) => this.handleForgotPassword( e ) );
		}
	}

	bindFaq() {
		document.querySelectorAll( '.faq-question' ).forEach( question => {
			question.addEventListener( 'click', function () {
				const item = this.closest( '.faq-item' );
				item.classList.toggle( 'active' );
			} );
		} );
	}

	checkUrlParams() {
		const urlParams = new URLSearchParams( window.location.search );
		const tab = urlParams.get( 'tab' );

		if ( tab === 'register' ) {
			const registerTab = document.getElementById( 'registerTab' );
			if ( registerTab ) registerTab.click();
		}
	}

	handleLogin( e ) {
		e.preventDefault();

		const identifier = document.getElementById( 'loginIdentifier' );
		const password = document.getElementById( 'loginPassword' );

		let isValid = true;

		// Валидация
		if ( !identifier.value.trim() ) {
			this.showError( 'loginIdentifierError', 'Введите email или номер телефона' );
			identifier.classList.add( 'error' );
			isValid = false;
		} else {
			this.clearError( 'loginIdentifierError' );
			identifier.classList.remove( 'error' );
		}

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
			// Имитация отправки формы
			const submitBtn = document.getElementById( 'loginSubmitBtn' );
			submitBtn.disabled = true;
			submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Вход...';

			setTimeout( () => {
				// Здесь должен быть реальный запрос к серверу
				this.showNotification( 'Вход выполнен успешно!', 'success' );

				// Перенаправление на главную
				setTimeout( () => {
					window.location.href = 'index.html';
				}, 1500 );
			}, 1500 );
		}
	}

	handleRegister( e ) {
		e.preventDefault();

		const name = document.getElementById( 'registerName' );
		const email = document.getElementById( 'registerEmail' );
		const phone = document.getElementById( 'registerPhone' );
		const password = document.getElementById( 'registerPassword' );
		const confirm = document.getElementById( 'registerConfirmPassword' );
		const agree = document.getElementById( 'agreeTerms' );

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

		// Валидация подтверждения
		if ( password.value !== confirm.value ) {
			this.showError( 'registerConfirmError', 'Пароли не совпадают' );
			confirm.classList.add( 'error' );
			isValid = false;
		} else {
			this.clearError( 'registerConfirmError' );
			confirm.classList.remove( 'error' );
		}

		// Проверка согласия
		if ( !agree.checked ) {
			this.showNotification( 'Необходимо согласиться с правилами сайта', 'error' );
			isValid = false;
		}

		if ( isValid ) {
			// Имитация отправки формы
			const submitBtn = document.getElementById( 'registerSubmitBtn' );
			submitBtn.disabled = true;
			submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Регистрация...';

			setTimeout( () => {
				// Здесь должен быть реальный запрос к серверу
				this.showNotification( 'Регистрация прошла успешно!', 'success' );

				// Перенаправление на страницу входа
				setTimeout( () => {
					window.location.href = 'login.html?tab=login';
				}, 1500 );
			}, 2000 );
		}
	}

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
			// Здесь должен быть реальный запрос к серверу
			alert( 'Инструкция по восстановлению пароля отправлена на ваш email/телефон' );

			const modal = document.getElementById( 'forgotPasswordModal' );
			modal.style.display = 'none';

			submitBtn.disabled = false;
			submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Отправить инструкцию';

			document.getElementById( 'forgotIdentifier' ).value = '';
		}, 1500 );
	}

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

	showError( elementId, message ) {
		const errorElement = document.getElementById( elementId );
		if ( errorElement ) {
			errorElement.textContent = message;
		}
	}

	clearError( elementId ) {
		const errorElement = document.getElementById( elementId );
		if ( errorElement ) {
			errorElement.textContent = '';
		}
	}

	clearErrors() {
		document.querySelectorAll( '.input-error' ).forEach( el => el.textContent = '' );
		document.querySelectorAll( '.auth-input' ).forEach( el => el.classList.remove( 'error' ) );
	}

	showNotification( message, type = 'info' ) {
		// Проверяем, есть ли уже контейнер для уведомлений
		let container = document.querySelector( '.notification-container' );

		if ( !container ) {
			container = document.createElement( 'div' );
			container.className = 'notification-container';
			document.body.appendChild( container );

			// Добавляем стили для уведомлений
			const style = document.createElement( 'style' );
			style.textContent = `
                .notification-container {
                    position: fixed;
                    top: 100px;
                    right: 20px;
                    z-index: 9999;
                }
                
                .notification {
                    background: white;
                    border-radius: 10px;
                    padding: 15px 25px;
                    margin-bottom: 10px;
                    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    animation: slideIn 0.3s ease forwards;
                    border-left: 4px solid;
                }
                
                .notification.success {
                    border-left-color: #2ecc71;
                }
                
                .notification.success i {
                    color: #2ecc71;
                }
                
                .notification.info {
                    border-left-color: #3498db;
                }
                
                .notification.info i {
                    color: #3498db;
                }
                
                .notification.error {
                    border-left-color: #e74c3c;
                }
                
                .notification.error i {
                    color: #e74c3c;
                }
                
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateX(100px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                
                @keyframes fadeOut {
                    from {
                        opacity: 1;
                        transform: translateX(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(100px);
                    }
                }
            `;
			document.head.appendChild( style );
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
} );