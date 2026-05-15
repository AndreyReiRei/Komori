/**
 * Главный файл сайта "Комори"
 * Общие функции для всех страниц
 */

// ========== ОПРЕДЕЛЕНИЕ КОРНЯ САЙТА ==========
/**
 * Динамическое определение корня сайта
 * @returns {string} относительный путь к корню
 */
function getSiteRoot() {
	const path = window.location.pathname;

	// Если мы в папке pages html/ или pages/
	if ( path.includes( '/pages html/' ) || path.includes( '/pages/' ) ) {
		return '../';
	}

	// Если мы в подпапке catalog pages/ или pages info/
	if ( path.includes( '/catalog pages/' ) || path.includes( '/pages info/' ) ) {
		return '../../';
	}

	// Иначе мы в корне
	return './';
}

// Глобальная переменная для доступа из других скриптов
window.siteRoot = getSiteRoot();

document.addEventListener( 'DOMContentLoaded', function () {
	// Плавный скролл для якорных ссылок
	initSmoothScroll();

	// Обработка модальных окон
	API.initModalHandlers();

	// Обновление года в футере
	updateCopyrightYear();

	// Обработка форм
	initFormValidation();

	// Анимации при скролле
	initScrollAnimations();

	// Улучшение доступности
	enhanceAccessibility();

	// Обновление счетчиков в шапке
	API.updateHeaderCounters();

	// Обновление аватара в шапке
	updateHeaderAvatar();

	console.log( 'Сайт "Комори" загружен' );
	console.log( '📁 Корень сайта:', window.siteRoot );
} );

// ========== ОБНОВЛЕНИЕ АВАТАРА В ШАПКЕ ==========
/**
 * Обновление аватара пользователя в шапке сайта
 * Эта функция вызывается на каждой странице после загрузки
 */
function updateHeaderAvatar() {
	const currentUser = localStorage.getItem( 'komori_current_user' );
	const headerAvatar = document.getElementById( 'headerAvatar' );
	const headerAvatarIcon = document.getElementById( 'headerAvatarIcon' );
	const authText = document.getElementById( 'authText' );
	const authBtn = document.getElementById( 'authBtn' );

	if ( currentUser ) {
		try {
			const user = JSON.parse( currentUser );

			// Обновляем имя пользователя в шапке
			if ( authText ) {
				authText.textContent = user.name;
			}

			// Обновляем ссылку на страницу профиля
			if ( authBtn ) {
				authBtn.href = window.siteRoot + 'pages html/profile.html';
			}

			// Обновляем аватар, если он есть
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
		} catch ( e ) {
			console.error( 'Ошибка при обновлении аватара в шапке:', e );
		}
	} else {
		// Пользователь не авторизован - показываем иконку входа
		if ( headerAvatar ) {
			headerAvatar.style.display = 'none';
		}
		if ( headerAvatarIcon ) {
			headerAvatarIcon.style.display = 'block';
		}
		if ( authText ) {
			authText.textContent = 'Войти';
		}
		if ( authBtn ) {
			authBtn.href = window.siteRoot + 'pages html/login.html';
		}
	}
}

// ========== ПЛАВНЫЙ СКРОЛЛ ==========
/**
 * Инициализация плавного скролла для якорных ссылок
 */
function initSmoothScroll() {
	document.querySelectorAll( 'a[href^="#"]:not([href="#"])' ).forEach( anchor => {
		anchor.addEventListener( 'click', function ( e ) {
			const targetId = this.getAttribute( 'href' );
			const targetElement = document.querySelector( targetId );

			if ( targetElement ) {
				e.preventDefault();
				window.scrollTo( {
					top: targetElement.offsetTop - 100,
					behavior: 'smooth'
				} );

				// Закрываем мобильное меню если нужно
				closeMobileMenu();
			}
		} );
	} );
}

/**
 * Закрытие мобильного меню
 */
function closeMobileMenu() {
	if ( window.innerWidth <= 768 ) {
		const mainNav = document.getElementById( 'mainNav' );
		const burgerMenu = document.getElementById( 'burgerMenu' );
		const navOverlay = document.getElementById( 'navOverlay' );

		if ( mainNav?.classList.contains( 'active' ) ) {
			mainNav.classList.remove( 'active' );
			burgerMenu?.classList.remove( 'active' );
			navOverlay?.classList.remove( 'active' );
			document.body.style.overflow = '';
		}
	}
}

// ========== ФУТЕР ==========
/**
 * Обновление года в копирайте
 */
function updateCopyrightYear() {
	const copyright = document.querySelector( '.copyright' );
	if ( copyright && copyright.textContent.includes( '2024' ) ) {
		const currentYear = new Date().getFullYear();
		copyright.innerHTML = copyright.innerHTML.replace( '2024', currentYear );
	}
}

// ========== ФОРМЫ ==========
/**
 * Валидация форм (проверка обязательных полей)
 */
function initFormValidation() {
	document.querySelectorAll( 'form' ).forEach( form => {
		form.addEventListener( 'submit', function ( e ) {
			const requiredFields = this.querySelectorAll( '[required]' );
			let isValid = true;

			requiredFields.forEach( field => {
				if ( !field.value.trim() ) {
					isValid = false;
					field.style.borderColor = '#ff4757';

					field.addEventListener( 'input', function () {
						this.style.borderColor = '#ffe6ea';
					}, { once: true } );
				}
			} );

			if ( !isValid ) {
				e.preventDefault();
				alert( 'Пожалуйста, заполните все обязательные поля.' );
			}
		} );
	} );
}

// ========== АНИМАЦИИ ==========
/**
 * Инициализация анимаций при скролле
 */
function initScrollAnimations() {
	const animatedElements = document.querySelectorAll( '.animate-on-scroll' );

	if ( animatedElements.length > 0 ) {
		const observer = new IntersectionObserver( ( entries ) => {
			entries.forEach( entry => {
				if ( entry.isIntersecting ) {
					entry.target.classList.add( 'animated' );
					observer.unobserve( entry.target );
				}
			} );
		}, {
			threshold: 0.1,
			rootMargin: '0px 0px -50px 0px'
		} );

		animatedElements.forEach( element => observer.observe( element ) );
	}
}

// ========== ДОСТУПНОСТЬ ==========
/**
 * Улучшение доступности (клавиатурная навигация)
 */
function enhanceAccessibility() {
	document.querySelectorAll( 'button, [role="button"]' ).forEach( button => {
		if ( button.getAttribute( 'role' ) === 'button' ) {
			button.addEventListener( 'keydown', function ( e ) {
				if ( e.key === 'Enter' || e.key === ' ' ) {
					e.preventDefault();
					this.click();
				}
			} );
		}

		// Фокус-стили
		button.addEventListener( 'focus', () => {
			button.style.outline = '2px solid #ff6b6b';
			button.style.outlineOffset = '2px';
		} );

		button.addEventListener( 'blur', () => {
			button.style.outline = 'none';
		} );
	} );
}

// ========== ОТСТУП ДЛЯ MAIN ==========
/**
 * Отступ для Main от Header (для мобильных устройств)
 */
function initHeaderOffset() {
	const header = document.querySelector( 'header' );
	const main = document.querySelector( 'main' );

	if ( !header || !main ) return;

	function updateOffset() {
		const isMobile = window.innerWidth < 993;

		if ( isMobile ) {
			const headerHeight = header.offsetHeight;
			main.style.marginTop = headerHeight + 'px';
		} else {
			main.style.marginTop = '0';
		}
	}

	updateOffset();
	window.addEventListener( 'resize', updateOffset );
}

// ========== СЛУШАТЕЛЬ ИЗМЕНЕНИЙ STORAGE ==========
/**
 * Слушаем изменения localStorage в других вкладках
 * Если пользователь вышел из аккаунта в другой вкладке, обновляем шапку
 */
window.addEventListener( 'storage', function ( e ) {
	if ( e.key === 'komori_current_user' ) {
		updateHeaderAvatar();
		API.updateHeaderCounters();
	}
} );

// ========== СЛУШАТЕЛЬ КАСТОМНЫХ СОБЫТИЙ ==========
/**
 * Слушаем кастомные события обновления пользователя
 */
window.addEventListener( 'userUpdated', function () {
	updateHeaderAvatar();
	API.updateHeaderCounters();
} );

// ========== ИНИЦИАЛИЗАЦИЯ ==========
// Вызываем после загрузки
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', initHeaderOffset );
} else {
	initHeaderOffset();
}