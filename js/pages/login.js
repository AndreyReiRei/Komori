/**
 * Функционал страницы авторизации и регистрации
 * Сайт "Комори" - азиатский магазинчик
 * 
 * Версия 2.0 — добавлена продвинутая система валидации форм,
 * защита от повторной отправки, live-валидация при вводе.
 */

// ============================================================
// МОДУЛЬ ВАЛИДАЦИИ
// Встраиваем прямо в этот же файл, чтобы не зависеть
// от порядка загрузки скриптов на странице login.html
// ============================================================

const ValidationRules = {

	/**
	 * Проверка email — допустимые форматы:
	 * user@domain.ru, user.name@domain.com, user+tag@domain.co
	 */
	email: function ( value ) {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return {
			valid: emailRegex.test( value ),
			message: 'Введите корректный email (например: user@mail.ru)'
		};
	},

	/**
	 * Проверка пароля — минимум 8 символов,
	 * хотя бы одна буква и одна цифра
	 */
	password: function ( value ) {
		if ( !value || value.length === 0 ) {
			return { valid: false, message: 'Введите пароль' };
		}
		if ( value.length < 8 ) {
			return { valid: false, message: 'Пароль должен содержать минимум 8 символов' };
		}
		if ( !/[a-zA-Zа-яА-Я]/.test( value ) ) {
			return { valid: false, message: 'Пароль должен содержать хотя бы одну букву' };
		}
		if ( !/\d/.test( value ) ) {
			return { valid: false, message: 'Пароль должен содержать хотя бы одну цифру' };
		}
		return { valid: true, message: '' };
	},

	/**
	 * Проверка имени — минимум 2 символа,
	 * только буквы, пробелы и дефис
	 */
	name: function ( value ) {
		const trimmed = value.trim();
		if ( trimmed.length === 0 ) {
			return { valid: false, message: 'Введите ваше имя' };
		}
		if ( trimmed.length < 2 ) {
			return { valid: false, message: 'Имя должно содержать минимум 2 символа' };
		}
		if ( !/^[a-zA-Zа-яА-ЯёЁ\s-]+$/.test( trimmed ) ) {
			return { valid: false, message: 'Имя может содержать только буквы, пробелы и дефис' };
		}
		return { valid: true, message: '' };
	},

	/**
	 * Проверка телефона — российские номера,
	 * допустимые форматы: +79991234567, 89991234567,
	 * +7 (999) 123-45-67, 8-999-123-45-67
	 */
	phone: function ( value ) {
		// Убираем все пробелы, скобки и дефисы для проверки
		const cleaned = value.replace( /[\s\(\)\-]/g, '' );
		if ( cleaned.length === 0 ) {
			return { valid: false, message: 'Введите номер телефона' };
		}
		const phoneRegex = /^(\+7|8)\d{10}$/;
		if ( !phoneRegex.test( cleaned ) ) {
			return { valid: false, message: 'Введите корректный номер телефона (например: +79991234567)' };
		}
		return { valid: true, message: '' };
	},

	/**
	 * Проверка обязательного поля
	 * @param {string} value — значение поля
	 * @param {string} fieldName — название поля для сообщения об ошибке
	 */
	required: function ( value, fieldName ) {
		const valid = value !== null && value !== undefined && value.toString().trim() !== '';
		return {
			valid: valid,
			message: valid ? '' : ( fieldName || 'Поле' ) + ' обязательно для заполнения'
		};
	}
};

/**
 * Прогоняет объект с данными формы через набор правил
 * @param {Object} formData — { fieldName: value, ... }
 * @param {Object} rules — { fieldName: ['rule1', 'rule2', ...], ... }
 * @returns {Object} { isValid: Boolean, errors: { fieldName: 'message', ... } }
 */
function validateForm( formData, rules ) {
	var errors = {};
	var isValid = true;

	// Перебираем все поля, для которых заданы правила
	for ( var fieldName in rules ) {
		if ( !rules.hasOwnProperty( fieldName ) ) continue;

		var value = formData[fieldName] || '';
		var fieldRules = rules[fieldName];

		// Применяем каждое правило к полю по очереди
		for ( var i = 0; i < fieldRules.length; i++ ) {
			var rule = fieldRules[i];
			var result = null;

			// Если правило задано строкой — ищем его в ValidationRules
			if ( typeof rule === 'string' ) {
				if ( ValidationRules[rule] ) {
					result = ValidationRules[rule]( value );
				}
			}
			// Если правило задано функцией — вызываем напрямую
			else if ( typeof rule === 'function' ) {
				result = rule( value );
			}

			// Если проверка не пройдена — фиксируем ошибку и переходим к следующему полю
			if ( result && !result.valid ) {
				errors[fieldName] = result.message;
				isValid = false;
				break;
			}
		}
	}

	return {
		isValid: isValid,
		errors: errors
	};
}

/**
 * Отображает ошибки валидации на форме
 * @param {HTMLElement} form — DOM-элемент формы
 * @param {Object} errors — { fieldName: 'message', ... }
 */
function showValidationErrors( form, errors ) {
	// Сначала очищаем все предыдущие ошибки
	clearValidationErrors( form );

	// Для каждого поля с ошибкой
	for ( var fieldName in errors ) {
		if ( !errors.hasOwnProperty( fieldName ) ) continue;

		var message = errors[fieldName];
		var input = form.querySelector( '[name="' + fieldName + '"]' );
		if ( !input ) continue;

		// Добавляем класс ошибки на поле ввода
		input.classList.add( 'validation-error' );

		// Создаём элемент с текстом ошибки
		var errorElement = document.createElement( 'span' );
		errorElement.className = 'validation-message';
		errorElement.textContent = message;

		// Ищем родительский контейнер .form-group или ближайшего родителя
		var parent = input.closest( '.form-group' ) || input.parentElement;
		parent.appendChild( errorElement );
	}

	// Прокручиваем к первому полю с ошибкой
	var firstError = form.querySelector( '.validation-error' );
	if ( firstError ) {
		firstError.scrollIntoView( { behavior: 'smooth', block: 'center' } );
		// Фокусируемся на первом ошибочном поле
		setTimeout( function () {
			firstError.focus();
		}, 300 );
	}
}

/**
 * Удаляет все визуальные индикаторы ошибок с формы
 * @param {HTMLElement} form — DOM-элемент формы
 */
function clearValidationErrors( form ) {
	// Убираем классы ошибок со всех полей
	var errorInputs = form.querySelectorAll( '.validation-error' );
	for ( var i = 0; i < errorInputs.length; i++ ) {
		errorInputs[i].classList.remove( 'validation-error' );
	}

	// Удаляем все сообщения об ошибках
	var errorMessages = form.querySelectorAll( '.validation-message' );
	for ( var j = 0; j < errorMessages.length; j++ ) {
		errorMessages[j].remove();
	}
}

/**
 * Включает живую валидацию: убирает ошибку при вводе,
 * проверяет поле при уходе с него (событие blur)
 * @param {HTMLElement} form — DOM-элемент формы
 * @param {Object} rules — правила валидации
 */
function setupLiveValidation( form, rules ) {
	var inputs = form.querySelectorAll( 'input:not([type="checkbox"]):not([type="radio"])' );

	// Вешаем обработчики на каждое поле ввода
	for ( var i = 0; i < inputs.length; i++ ) {
		var input = inputs[i];

		// При вводе текста — убираем ошибку с этого поля
		input.addEventListener( 'input', function () {
			var fieldName = this.name;
			if ( !fieldName || !rules[fieldName] ) return;

			// Убираем красную рамку
			this.classList.remove( 'validation-error' );

			// Удаляем текст ошибки рядом с полем
			var parent = this.closest( '.form-group' ) || this.parentElement;
			var errorMsg = parent.querySelector( '.validation-message' );
			if ( errorMsg ) {
				errorMsg.remove();
			}
		} );

		// Когда пользователь ушёл с поля — проверяем его
		input.addEventListener( 'blur', function () {
			var fieldName = this.name;
			if ( !fieldName || !rules[fieldName] ) return;

			var value = this.value;
			var fieldRules = rules[fieldName];

			// Прогоняем значение через все правила для этого поля
			for ( var j = 0; j < fieldRules.length; j++ ) {
				var rule = fieldRules[j];
				var result = null;

				if ( typeof rule === 'string' && ValidationRules[rule] ) {
					result = ValidationRules[rule]( value );
				} else if ( typeof rule === 'function' ) {
					result = rule( value );
				}

				// Если нашли ошибку — показываем и выходим
				if ( result && !result.valid ) {
					// Сначала убираем старую ошибку
					this.classList.remove( 'validation-error' );
					var parent = this.closest( '.form-group' ) || this.parentElement;
					var oldMsg = parent.querySelector( '.validation-message' );
					if ( oldMsg ) oldMsg.remove();

					// Показываем новую
					this.classList.add( 'validation-error' );
					var errorElement = document.createElement( 'span' );
					errorElement.className = 'validation-message';
					errorElement.textContent = result.message;
					parent.appendChild( errorElement );
					break;
				}
			}
		} );
	}
}

// ============================================================
// ОСНОВНОЙ КЛАСС AUTH PAGE
// ============================================================

class AuthPage {

	constructor() {
		// Загружаем список пользователей из store или localStorage
		this.users = this.loadUsers();

		// Флаг защиты от повторной отправки форм
		this.isSubmitting = false;

		// Правила валидации для каждой формы
		this.validationRules = {
			// Правила для формы входа
			login: {
				loginIdentifier: ['required'],
				loginPassword: ['required']
			},

			// Правила для формы регистрации
			register: {
				registerName: ['required', 'name'],
				registerEmail: ['required', 'email'],
				registerPhone: ['required', 'phone'],
				registerPassword: ['required', 'password'],
				registerConfirmPassword: [
					'required',
					// Кастомное правило: проверка совпадения паролей
					function ( value ) {
						var passwordInput = document.getElementById( 'registerPassword' );
						var password = passwordInput ? passwordInput.value : '';
						return {
							valid: value === password,
							message: 'Пароли не совпадают'
						};
					}
				]
			},

			// Правила для формы восстановления пароля
			recovery: {
				recoveryEmail: ['required', 'email']
			}
		};

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
		} else {
			// Пользователь не авторизован - обновляем ссылку в подвале
			this.updateFooterProfileLink();
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

		// Обновляем ссылку в подвале
		this.updateFooterProfileLink();
	}

	/**
	 * Обновляет ссылку "Мой аккаунт" в подвале в зависимости от авторизации
	 * Этот метод работает на всех страницах сайта
	 */
	updateFooterProfileLink() {
		// Ищем ссылку на профиль в подвале (первая ссылка в блоке profile-links)
		const profileLink = document.querySelector( '.footer-column .profile-links li:first-child a' );
		if ( !profileLink ) return;

		const currentUser = localStorage.getItem( 'komori_current_user' );

		if ( currentUser ) {
			try {
				const user = JSON.parse( currentUser );
				profileLink.href = '/pages html/profile.html';
				profileLink.innerHTML = '<i class="fas fa-user-circle"></i> Мой профиль';
			} catch ( e ) {
				profileLink.href = '/pages html/login.html';
				profileLink.innerHTML = '<i class="fas fa-user-circle"></i> Войти / Регистрация';
			}
		} else {
			profileLink.href = '/pages html/login.html';
			profileLink.innerHTML = '<i class="fas fa-user-circle"></i> Войти / Регистрация';
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

		// Настройка живой валидации для всех форм
		this.initLiveValidation();

		// Дополнительно обновляем ссылку в подвале при загрузке
		this.updateFooterProfileLink();
	}

	/**
	 * Инициализация живой валидации для форм на странице
	 */
	initLiveValidation() {
		// Форма входа
		const loginForm = document.getElementById( 'loginFormElement' );
		if ( loginForm ) {
			setupLiveValidation( loginForm, this.validationRules.login );
		}

		// Форма регистрации
		const registerForm = document.getElementById( 'registerFormElement' );
		if ( registerForm ) {
			setupLiveValidation( registerForm, this.validationRules.register );
		}

		// Форма восстановления пароля
		const recoveryForm = document.getElementById( 'recoveryFormElement' );
		if ( recoveryForm ) {
			setupLiveValidation( recoveryForm, this.validationRules.recovery );
		}
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
	 * Блокирует кнопку отправки формы на время обработки
	 * Защита от двойного клика и повторной отправки
	 * @param {HTMLElement} form — DOM-элемент формы
	 * @returns {string} — оригинальный текст кнопки (для восстановления)
	 */
	lockSubmitButton( form ) {
		const submitBtn = form.querySelector( 'button[type="submit"]' );
		if ( !submitBtn ) return '';

		const originalText = submitBtn.innerHTML;
		submitBtn.disabled = true;
		submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Подождите...';
		return originalText;
	}

	/**
	 * Разблокирует кнопку отправки формы
	 * @param {HTMLElement} form — DOM-элемент формы
	 * @param {string} originalText — оригинальный текст кнопки
	 */
	unlockSubmitButton( form, originalText ) {
		const submitBtn = form.querySelector( 'button[type="submit"]' );
		if ( !submitBtn ) return;

		submitBtn.disabled = false;
		submitBtn.innerHTML = originalText;
	}

	/**
	 * Обработка входа пользователя
	 */
	handleLogin( e ) {
		e.preventDefault();

		// Защита от повторной отправки
		if ( this.isSubmitting ) return;
		this.isSubmitting = true;

		const loginForm = document.getElementById( 'loginFormElement' );

		// Блокируем кнопку отправки
		const originalBtnText = this.lockSubmitButton( loginForm );

		const identifier = document.getElementById( 'loginIdentifier' );
		const password = document.getElementById( 'loginPassword' );
		const rememberMe = document.getElementById( 'rememberMe' );

		// Собираем данные формы
		const formData = {
			loginIdentifier: identifier ? identifier.value : '',
			loginPassword: password ? password.value : ''
		};

		// Запускаем новую систему валидации
		const validation = validateForm( formData, this.validationRules.login );

		if ( !validation.isValid ) {
			// Показываем ошибки валидации
			showValidationErrors( loginForm, validation.errors );

			// Разблокируем кнопку
			this.unlockSubmitButton( loginForm, originalBtnText );
			this.isSubmitting = false;
			return;
		}

		// Очищаем ошибки валидации перед отправкой
		clearValidationErrors( loginForm );

		// Синхронизируем пользователей из store
		this.syncUsersFromStore();

		// Ищем пользователя по email или телефону
		const user = this.users.find( u =>
			( u.email === identifier.value || u.phone === identifier.value ) &&
			u.password === password.value
		);

		if ( user ) {
			// Успешный вход
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

			// Обновляем ссылку в подвале
			this.updateFooterProfileLink();

			// Отправляем событие об обновлении пользователя
			window.dispatchEvent( new CustomEvent( 'userUpdated' ) );

			setTimeout( () => {
				window.location.href = '/index.html';
			}, 1500 );
		} else {
			// Ошибка — неверные данные
			this.showNotification( 'Неверный email/телефон или пароль', 'error' );

			// Подсвечиваем оба поля как ошибочные
			if ( identifier ) identifier.classList.add( 'validation-error' );
			if ( password ) password.classList.add( 'validation-error' );

			// Разблокируем кнопку
			this.unlockSubmitButton( loginForm, originalBtnText );
			this.isSubmitting = false;
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

		// Защита от повторной отправки
		if ( this.isSubmitting ) return;
		this.isSubmitting = true;

		const registerForm = document.getElementById( 'registerFormElement' );

		// Блокируем кнопку отправки
		const originalBtnText = this.lockSubmitButton( registerForm );

		const name = document.getElementById( 'registerName' );
		const email = document.getElementById( 'registerEmail' );
		const phone = document.getElementById( 'registerPhone' );
		const password = document.getElementById( 'registerPassword' );
		const confirm = document.getElementById( 'registerConfirmPassword' );
		const agree = document.getElementById( 'agreeTerms' );
		const subscribe = document.getElementById( 'subscribeNews' );

		// Собираем данные формы
		const formData = {
			registerName: name ? name.value : '',
			registerEmail: email ? email.value : '',
			registerPhone: phone ? phone.value : '',
			registerPassword: password ? password.value : '',
			registerConfirmPassword: confirm ? confirm.value : ''
		};

		// Запускаем новую систему валидации
		const validation = validateForm( formData, this.validationRules.register );

		// Дополнительная проверка: уникальность email
		if ( validation.isValid && email && email.value.trim() ) {
			this.syncUsersFromStore();
			if ( this.users.some( u => u.email === email.value.trim() ) ) {
				validation.isValid = false;
				validation.errors.registerEmail = 'Этот email уже зарегистрирован';
			}
		}

		// Дополнительная проверка: уникальность телефона
		if ( validation.isValid && phone && phone.value.trim() ) {
			const cleanPhone = phone.value.replace( /[\s\(\)\-]/g, '' );
			if ( this.users.some( u => u.phone === cleanPhone ) ) {
				validation.isValid = false;
				validation.errors.registerPhone = 'Этот телефон уже зарегистрирован';
			}
		}

		// Дополнительная проверка: согласие с правилами
		if ( validation.isValid && agree && !agree.checked ) {
			validation.isValid = false;
			this.showNotification( 'Необходимо согласиться с правилами сайта', 'error' );
		}

		if ( !validation.isValid ) {
			// Показываем ошибки валидации
			showValidationErrors( registerForm, validation.errors );

			// Разблокируем кнопку
			this.unlockSubmitButton( registerForm, originalBtnText );
			this.isSubmitting = false;
			return;
		}

		// Очищаем ошибки валидации
		clearValidationErrors( registerForm );

		// Создаём нового пользователя
		const cleanPhone = phone.value.replace( /[\s\(\)\-]/g, '' );
		const newUser = {
			id: Date.now(),
			name: name.value.trim(),
			email: email.value.trim(),
			phone: cleanPhone,
			password: password.value,
			subscribe: subscribe ? subscribe.checked : false,
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

		// Разблокируем кнопку перед редиректом
		this.unlockSubmitButton( registerForm, originalBtnText );

		setTimeout( () => {
			window.location.href = '/pages html/login.html?tab=login';
		}, 1500 );
	}

	/**
	 * Обработка восстановления пароля (новая вкладка)
	 */
	handleForgotPassword( e ) {
		e.preventDefault();

		// Защита от повторной отправки
		if ( this.isSubmitting ) return;
		this.isSubmitting = true;

		const recoveryForm = document.getElementById( 'recoveryFormElement' );
		const emailInput = document.getElementById( 'recoveryEmail' );
		const submitBtn = document.getElementById( 'recoverySubmitBtn' );

		// Собираем данные формы
		const formData = {
			recoveryEmail: emailInput ? emailInput.value : ''
		};

		// Запускаем новую систему валидации
		const validation = validateForm( formData, this.validationRules.recovery );

		if ( !validation.isValid ) {
			// Показываем ошибки валидации
			showValidationErrors( recoveryForm, validation.errors );
			this.isSubmitting = false;
			return;
		}

		// Очищаем ошибки валидации
		clearValidationErrors( recoveryForm );

		// Блокируем кнопку на время имитации запроса
		if ( submitBtn ) {
			submitBtn.disabled = true;
			submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
		}

		// Имитируем задержку отправки (как будто запрос к серверу)
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
				this.showNotification(
					'Новый пароль отправлен на ' + user.email + '. Проверьте почту!',
					'success'
				);

				// В реальном приложении здесь была бы отправка email
				console.log( 'Временный пароль для ' + user.email + ': ' + tempPassword );

				// Очищаем поле email
				emailInput.value = '';

				// Переключаемся на вкладку входа
				setTimeout( () => {
					const loginTab = document.getElementById( 'loginTab' );
					if ( loginTab ) loginTab.click();
				}, 2000 );
			} else {
				// Пользователь не найден — показываем ошибку
				const errorObj = { recoveryEmail: 'Пользователь с таким email не найден' };
				showValidationErrors( recoveryForm, errorObj );
			}

			// Восстанавливаем кнопку
			if ( submitBtn ) {
				submitBtn.disabled = false;
				submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Отправить инструкцию';
			}

			this.isSubmitting = false;
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
	 * Показать ошибку валидации (старый метод — оставлен для обратной совместимости)
	 */
	showError( elementId, message ) {
		const errorElement = document.getElementById( elementId );
		if ( errorElement ) {
			errorElement.textContent = message;
		}
	}

	/**
	 * Очистить ошибку валидации (старый метод — оставлен для обратной совместимости)
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
		// Очищаем старые ошибки
		document.querySelectorAll( '.input-error' ).forEach( el => el.textContent = '' );
		document.querySelectorAll( '.auth-input' ).forEach( el => el.classList.remove( 'error' ) );

		// Очищаем новые ошибки валидации
		const forms = document.querySelectorAll( '.auth-form' );
		for ( var i = 0; i < forms.length; i++ ) {
			clearValidationErrors( forms[i] );
		}
	}

	/**
	 * Показать всплывающее уведомление
	 */
	showNotification( message, type ) {
		if ( !type ) type = 'info';

		let container = document.querySelector( '.notification-container' );

		if ( !container ) {
			container = document.createElement( 'div' );
			container.className = 'notification-container';
			document.body.appendChild( container );
		}

		const notification = document.createElement( 'div' );
		notification.className = 'notification ' + type;

		let icon = '';
		if ( type === 'success' ) icon = 'fa-check-circle';
		else if ( type === 'info' ) icon = 'fa-info-circle';
		else if ( type === 'error' ) icon = 'fa-exclamation-circle';

		notification.innerHTML =
			'<i class="fas ' + icon + '"></i>' +
			'<span>' + message + '</span>';

		container.appendChild( notification );

		setTimeout( () => {
			notification.style.animation = 'fadeOut 0.3s ease forwards';
			setTimeout( () => notification.remove(), 300 );
		}, 3000 );
	}
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
// ============================================================

document.addEventListener( 'DOMContentLoaded', function () {
	window.authPage = new AuthPage();
	console.log( 'Страница авторизации инициализирована (версия 2.0 с валидацией)' );
} );