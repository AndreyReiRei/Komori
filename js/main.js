/**
 * ============================================================================
 * MAIN.JS - ГЛАВНЫЙ ФАЙЛ САЙТА "КОМОРИ"
 * ============================================================================
 * 
 * Этот файл содержит:
 * 1. Определение корня сайта (для корректных путей к изображениям)
 * 2. Общие функции для всех страниц
 * 3. Инициализацию глобальных обработчиков
 * 
 * ============================================================================
 */

// ============================================================================
// 1. ОПРЕДЕЛЕНИЕ КОРНЯ САЙТА
// ============================================================================

/**
 * Динамическое определение корня сайта относительно текущей страницы
 * 
 * Алгоритм:
 * - index.html (корень) -> './'
 * - pages html/cart.html -> '../'
 * - pages html/catalog pages/figurines.html -> '../../'
 * 
 * @returns {string} Относительный путь к корню сайта
 */
function getSiteRoot() {
	const path = window.location.pathname;

	console.log( '🔍 MAIN: Определение корня для пути:', path );

	// Если страница в папке pages html/ или pages/
	if ( path.includes( '/pages html/' ) || path.includes( '/pages/' ) ) {
		console.log( '📁 MAIN: Страница в папке pages html/, root = "../"' );
		return '../';
	}

	// Если страница в подпапке catalog pages/ или pages info/
	if ( path.includes( '/catalog pages/' ) || path.includes( '/pages info/' ) ) {
		console.log( '📁 MAIN: Страница в подпапке, root = "../../"' );
		return '../../';
	}

	// По умолчанию - корень сайта
	console.log( '📁 MAIN: Страница в корне, root = "./"' );
	return './';
}

// Сохраняем корень сайта в глобальную переменную для доступа из других скриптов
window.siteRoot = getSiteRoot();
console.log( '✅ MAIN: Корень сайта установлен:', window.siteRoot );

// ============================================================================
// 2. ОБНОВЛЕНИЕ АВАТАРА В ШАПКЕ
// ============================================================================

/**
 * Обновление аватара пользователя в шапке сайта
 * 
 * Что делает:
 * - Показывает имя пользователя вместо "Войти"
 * - Меняет ссылку на страницу профиля
 * - Отображает аватар (если есть)
 * 
 * Вызывается:
 * - При загрузке любой страницы
 * - При изменении данных пользователя
 */
function updateHeaderAvatar() {
	const currentUser = localStorage.getItem( 'komori_current_user' );
	const headerAvatar = document.getElementById( 'headerAvatar' );
	const headerAvatarIcon = document.getElementById( 'headerAvatarIcon' );
	const authText = document.getElementById( 'authText' );
	const authBtn = document.getElementById( 'authBtn' );

	console.log( '👤 MAIN: Обновление аватара, пользователь:', currentUser ? 'авторизован' : 'не авторизован' );

	if ( currentUser ) {
		try {
			const user = JSON.parse( currentUser );
			console.log( '👤 MAIN: Пользователь:', user.name );

			// Обновляем имя пользователя в шапке
			if ( authText ) {
				authText.textContent = user.name;
			}

			// Обновляем ссылку на страницу профиля
			if ( authBtn ) {
				authBtn.href = '/pages html/profile.html';
			}

			// Обновляем аватар, если он есть
			if ( headerAvatar && headerAvatarIcon ) {
				if ( user.avatar && user.avatar !== 'null' && user.avatar !== '' ) {
					headerAvatar.src = user.avatar;
					headerAvatar.style.display = 'block';
					headerAvatarIcon.style.display = 'none';
					console.log( '🖼️ MAIN: Аватар отображается' );
				} else {
					headerAvatar.style.display = 'none';
					headerAvatarIcon.style.display = 'block';
					console.log( '🖼️ MAIN: Аватара нет, показываем иконку' );
				}
			}
		} catch ( e ) {
			console.error( '❌ MAIN: Ошибка при обновлении аватара:', e );
			// В случае ошибки показываем обычную иконку входа
			if ( headerAvatar ) headerAvatar.style.display = 'none';
			if ( headerAvatarIcon ) headerAvatarIcon.style.display = 'block';
			if ( authText ) authText.textContent = 'Войти';
			if ( authBtn ) authBtn.href = '/pages html/login.html';
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
			authBtn.href = '/pages html/login.html';
		}
	}
}

// ============================================================================
// 3. ОБНОВЛЕНИЕ ССЫЛКИ В ПОДВАЛЕ
// ============================================================================

/**
 * Обновляет ссылку "Мой аккаунт" в подвале в зависимости от авторизации
 * 
 * Если пользователь авторизован:
 * - Ссылка ведёт на страницу профиля
 * - Текст: "Мой профиль"
 * 
 * Если пользователь не авторизован:
 * - Ссылка ведёт на страницу входа
 * - Текст: "Войти / Регистрация"
 */
function updateFooterProfileLink() {
	// Ищем ссылку на профиль в подвале (первая ссылка в блоке profile-links)
	const profileLink = document.querySelector( '.footer-column .profile-links li:first-child a' );

	if ( !profileLink ) {
		console.log( '⚠️ MAIN: Ссылка на профиль в подвале не найдена' );
		return;
	}

	const currentUser = localStorage.getItem( 'komori_current_user' );

	if ( currentUser ) {
		try {
			const user = JSON.parse( currentUser );
			profileLink.href = '/pages html/profile.html';
			profileLink.innerHTML = '<i class="fas fa-user-circle"></i> Мой профиль';
			console.log( '🔗 MAIN: Ссылка в подвале обновлена на профиль для:', user.name );
		} catch ( e ) {
			profileLink.href = '/pages html/login.html';
			profileLink.innerHTML = '<i class="fas fa-user-circle"></i> Войти / Регистрация';
			console.log( '🔗 MAIN: Ошибка парсинга, ссылка на вход' );
		}
	} else {
		profileLink.href = '/pages html/login.html';
		profileLink.innerHTML = '<i class="fas fa-user-circle"></i> Войти / Регистрация';
		console.log( '🔗 MAIN: Ссылка в подвале обновлена на вход' );
	}
}

// ============================================================================
// 4. ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
// ============================================================================

document.addEventListener( 'DOMContentLoaded', function () {
	console.log( '🚀 MAIN: DOM загружен, инициализация...' );

	// Плавный скролл для якорных ссылок
	initSmoothScroll();

	// Обработка модальных окон (закрытие)
	API.initModalHandlers();

	// Обновление года в футере
	updateCopyrightYear();

	// Валидация форм
	initFormValidation();

	// Анимации при скролле
	initScrollAnimations();

	// Улучшение доступности (клавиатура, фокус)
	enhanceAccessibility();

	// Обновление счетчиков в шапке (корзина, избранное)
	API.updateHeaderCounters();

	// Обновление аватара пользователя в шапке
	updateHeaderAvatar();

	// Обновление ссылки в подвале
	updateFooterProfileLink();

	console.log( '✅ MAIN: Сайт "Комори" полностью загружен и инициализирован' );
} );

// ============================================================================
// 5. ПЛАВНЫЙ СКРОЛЛ
// ============================================================================

/**
 * Инициализация плавного скролла для якорных ссылок
 * 
 * Обрабатывает ссылки вида:
 * - <a href="#section">Перейти к секции</a>
 * 
 * Игнорирует:
 * - Пустые ссылки (href="#")
 * - Ссылки на другие страницы
 */
function initSmoothScroll() {
	const anchors = document.querySelectorAll( 'a[href^="#"]:not([href="#"])' );
	console.log( `🔗 MAIN: Найдено ${anchors.length} якорных ссылок для плавного скролла` );

	anchors.forEach( anchor => {
		anchor.addEventListener( 'click', function ( e ) {
			const targetId = this.getAttribute( 'href' );
			const targetElement = document.querySelector( targetId );

			if ( targetElement ) {
				e.preventDefault();

				// Плавная прокрутка к элементу
				window.scrollTo( {
					top: targetElement.offsetTop - 100, // Отступ 100px от верха
					behavior: 'smooth'
				} );

				console.log( `📜 MAIN: Плавный скролл к ${targetId}` );

				// Закрываем мобильное меню, если оно открыто
				closeMobileMenu();
			}
		} );
	} );
}

/**
 * Закрытие мобильного меню (бургера)
 * Вызывается после клика по ссылке или в других необходимых местах
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
			console.log( '🍔 MAIN: Мобильное меню закрыто' );
		}
	}
}

// ============================================================================
// 6. ФУТЕР
// ============================================================================

/**
 * Обновление года в копирайте футера
 * Ищет элемент .copyright и заменяет 2024 на текущий год
 */
function updateCopyrightYear() {
	const copyright = document.querySelector( '.copyright' );
	if ( copyright && copyright.textContent.includes( '2024' ) ) {
		const currentYear = new Date().getFullYear();
		copyright.innerHTML = copyright.innerHTML.replace( '2024', currentYear );
		console.log( `📅 MAIN: Год в копирайте обновлен на ${currentYear}` );
	}
}

// ============================================================================
// 7. ВАЛИДАЦИЯ ФОРМ
// ============================================================================

/**
 * Инициализация валидации форм
 * 
 * Что делает:
 * - Проверяет все поля с атрибутом [required]
 * - Подсвечивает красным незаполненные поля
 * - Показывает alert при отправке пустой формы
 */
function initFormValidation() {
	const forms = document.querySelectorAll( 'form' );
	console.log( `📝 MAIN: Найдено ${forms.length} форм для валидации` );

	forms.forEach( form => {
		form.addEventListener( 'submit', function ( e ) {
			const requiredFields = this.querySelectorAll( '[required]' );
			let isValid = true;

			requiredFields.forEach( field => {
				if ( !field.value.trim() ) {
					isValid = false;
					field.style.borderColor = '#ff4757';
					console.log( `⚠️ MAIN: Поле не заполнено:`, field );

					// Убираем красную обводку при вводе
					field.addEventListener( 'input', function () {
						this.style.borderColor = '#ffe6ea';
					}, { once: true } );
				}
			} );

			if ( !isValid ) {
				e.preventDefault();
				alert( 'Пожалуйста, заполните все обязательные поля.' );
				console.log( '❌ MAIN: Форма не отправлена из-за незаполненных полей' );
			} else {
				console.log( '✅ MAIN: Форма валидна, отправляем' );
			}
		} );
	} );
}

// ============================================================================
// 8. АНИМАЦИИ ПРИ СКРОЛЛЕ
// ============================================================================

/**
 * Инициализация анимаций при скролле
 * 
 * Элементы с классом .animate-on-scroll появляются с анимацией
 * при попадании в область видимости
 */
function initScrollAnimations() {
	const animatedElements = document.querySelectorAll( '.animate-on-scroll' );

	if ( animatedElements.length > 0 ) {
		console.log( `✨ MAIN: Найдено ${animatedElements.length} элементов для анимации при скролле` );

		const observer = new IntersectionObserver( ( entries ) => {
			entries.forEach( entry => {
				if ( entry.isIntersecting ) {
					entry.target.classList.add( 'animated' );
					observer.unobserve( entry.target );
					console.log( `✨ MAIN: Анимация для элемента`, entry.target );
				}
			} );
		}, {
			threshold: 0.1,        // Срабатывает когда 10% элемента видно
			rootMargin: '0px 0px -50px 0px'  // Смещение срабатывания
		} );

		animatedElements.forEach( element => observer.observe( element ) );
	}
}

// ============================================================================
// 9. УЛУЧШЕНИЕ ДОСТУПНОСТИ
// ============================================================================

/**
 * Улучшение доступности для пользователей с клавиатуры
 * 
 * Что делает:
 * - Добавляет обработку Enter и Space для элементов с role="button"
 * - Добавляет фокус-стили для кнопок
 */
function enhanceAccessibility() {
	const buttons = document.querySelectorAll( 'button, [role="button"]' );
	console.log( `♿ MAIN: Улучшение доступности для ${buttons.length} кнопок` );

	buttons.forEach( button => {
		// Обработка клавиатуры для элементов с role="button"
		if ( button.getAttribute( 'role' ) === 'button' ) {
			button.addEventListener( 'keydown', function ( e ) {
				if ( e.key === 'Enter' || e.key === ' ' ) {
					e.preventDefault();
					this.click();
					console.log( `⌨️ MAIN: Кнопка активирована клавиатурой` );
				}
			} );
		}

		// Добавляем фокус-стили
		button.addEventListener( 'focus', () => {
			button.style.outline = '2px solid #ff6b6b';
			button.style.outlineOffset = '2px';
		} );

		button.addEventListener( 'blur', () => {
			button.style.outline = 'none';
		} );
	} );
}

// ============================================================================
// 10. ОТСТУП ДЛЯ MAIN (МОБИЛЬНЫЕ УСТРОЙСТВА)
// ============================================================================

/**
 * Установка отступа для основного контента под фиксированным хедером
 * 
 * Нужно только на мобильных устройствах, где header фиксированный
 */
function initHeaderOffset() {
	const header = document.querySelector( 'header' );
	const main = document.querySelector( 'main' );

	if ( !header || !main ) {
		console.warn( '⚠️ MAIN: Не найдены элементы header или main' );
		return;
	}

	function updateOffset() {
		const isMobile = window.innerWidth < 993;

		if ( isMobile ) {
			const headerHeight = header.offsetHeight;
			main.style.marginTop = headerHeight + 'px';
			console.log( `📱 MAIN: Установлен отступ для main: ${headerHeight}px` );
		} else {
			main.style.marginTop = '0';
		}
	}

	updateOffset();
	window.addEventListener( 'resize', updateOffset );
	console.log( '📐 MAIN: Инициализирован отступ для мобильных устройств' );
}

// ============================================================================
// 11. СЛУШАТЕЛИ ГЛОБАЛЬНЫХ СОБЫТИЙ
// ============================================================================

/**
 * Слушаем изменения localStorage в других вкладках
 * Если пользователь вышел из аккаунта в другой вкладке, обновляем шапку и подвал
 */
window.addEventListener( 'storage', function ( e ) {
	if ( e.key === 'komori_current_user' ) {
		console.log( '🔄 MAIN: Изменены данные пользователя в другой вкладке' );
		updateHeaderAvatar();
		updateFooterProfileLink();
		API.updateHeaderCounters();
	}
} );

/**
 * Слушаем кастомные события обновления пользователя
 * Можно вызывать из других скриптов: window.dispatchEvent(new CustomEvent('userUpdated'));
 */
window.addEventListener( 'userUpdated', function () {
	console.log( '🔄 MAIN: Получено событие userUpdated' );
	updateHeaderAvatar();
	updateFooterProfileLink();
	API.updateHeaderCounters();
} );

// ============================================================================
// 12. ЗАПУСК ИНИЦИАЛИЗАЦИИ
// ============================================================================

// Запускаем initHeaderOffset после загрузки DOM
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', initHeaderOffset );
} else {
	initHeaderOffset();
}

console.log( '✅ MAIN.JS: Все модули загружены' );