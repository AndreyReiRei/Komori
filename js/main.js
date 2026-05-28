/**
 * ============================================================================
 * MAIN.JS - ГЛАВНЫЙ ФАЙЛ САЙТА "КОМОРИ" (ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ВЕРСИЯ)
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * - Определение корня сайта для корректных путей к ресурсам
 * - Общие функции для всех страниц (аватар, футер, навигация)
 * - Инициализация глобальных обработчиков (скролл, формы, доступность)
 * - Управление состоянием авторизации пользователя
 * 
 * ПОДКЛЮЧЕНИЕ:
 * - Должен подключаться ПЕРВЫМ на каждой странице
 * - Работает независимо от других модулей
 * - Создает глобальные переменные: window.siteRoot
 * 
 * БЕЗОПАСНОСТЬ:
 * - Использует textContent вместо innerHTML где возможно
 * - Проверяет существование API перед вызовом
 * - Обрабатывает ошибки парсинга JSON
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
 * - Подсчитывает количество сегментов пути (глубину вложенности)
 * - Генерирует соответствующее количество "../" для возврата в корень
 * 
 * Примеры:
 * - index.html (глубина 0)         -> './'
 * - pages html/cart.html (глубина 1) -> '../'
 * - pages html/catalog pages/figurines.html (глубина 2) -> '../../'
 * 
 * @returns {string} Относительный путь к корню сайта
 */
function getSiteRoot() {
	const path = window.location.pathname;
	console.log( '🔍 MAIN: Определение корня для пути:', path );

	// Убираем начальный и конечный слэши, считаем оставшиеся сегменты
	// Например: "/pages html/catalog pages/file.html" -> 2 сегмента
	const segments = path.replace( /^\/|\/$/g, '' ).split( '/' );

	// Глубина = количество папок (не считая сам файл)
	const depth = segments.length - 1;

	console.log( `📁 MAIN: Сегменты пути: [${segments.join( ', ' )}], глубина: ${depth}` );

	// Если файл в корне сайта
	if ( depth <= 0 ) {
		console.log( '📁 MAIN: Страница в корне сайта, root = "./"' );
		return './';
	}

	// Генерируем нужное количество "../"
	const root = '../'.repeat( depth );
	console.log( `📁 MAIN: Корень сайта = "${root}"` );

	return root;
}

// Сохраняем корень сайта в глобальную переменную
// Доступно из любого скрипта как window.siteRoot
window.siteRoot = getSiteRoot();
console.log( '✅ MAIN: Корень сайта установлен:', window.siteRoot );

// ============================================================================
// 2. ОБНОВЛЕНИЕ АВАТАРА ПОЛЬЗОВАТЕЛЯ В ШАПКЕ
// ============================================================================

/**
 * Обновляет информацию о пользователе в шапке сайта
 * 
 * Логика:
 * - Если пользователь авторизован:
 *   - Показывает имя пользователя вместо "Войти"
 *   - Меняет ссылку на страницу профиля
 *   - Отображает аватар (если есть) или иконку по умолчанию
 * 
 * - Если пользователь НЕ авторизован:
 *   - Показывает "Войти"
 *   - Ссылка ведет на страницу логина
 *   - Показывает иконку пользователя
 * 
 * Безопасность:
 * - Использует textContent для предотвращения XSS
 * - Проверяет валидность JSON в localStorage
 * - Обрабатывает отсутствие элементов в DOM
 */
function updateHeaderAvatar() {
	try {
		// Получаем данные пользователя из localStorage
		const currentUser = localStorage.getItem( 'komori_current_user' );

		// Находим элементы шапки (могут отсутствовать на некоторых страницах)
		const headerAvatar = document.getElementById( 'headerAvatar' );       // <img> с аватаром
		const headerAvatarIcon = document.getElementById( 'headerAvatarIcon' ); // <i> иконка по умолчанию
		const authText = document.getElementById( 'authText' );               // <span> с текстом
		const authBtn = document.getElementById( 'authBtn' );                 // <a> ссылка

		// Если нет основных элементов - выходим
		if ( !authBtn || !authText ) {
			console.warn( '⚠️ MAIN: Элементы шапки (authBtn, authText) не найдены в DOM' );
			return;
		}

		console.log( '👤 MAIN: Обновление аватара, пользователь:', currentUser ? 'авторизован' : 'не авторизован' );

		if ( currentUser ) {
			// ===== ПОЛЬЗОВАТЕЛЬ АВТОРИЗОВАН =====
			try {
				const user = JSON.parse( currentUser );
				console.log( '👤 MAIN: Данные пользователя:', { name: user.name, hasAvatar: !!user.avatar } );

				// Обновляем текст (безопасно через textContent)
				authText.textContent = user.name || 'Профиль';

				// Обновляем ссылку на профиль
				authBtn.href = '/pages html/profile.html';
				authBtn.title = 'Перейти в профиль';

				// Обновляем аватар
				if ( headerAvatar && headerAvatarIcon ) {
					// Проверяем, есть ли валидный аватар
					if ( user.avatar && user.avatar !== 'null' && user.avatar !== '' && user.avatar !== 'undefined' ) {
						// Показываем аватар пользователя
						headerAvatar.src = user.avatar;
						headerAvatar.style.display = 'block';
						headerAvatarIcon.style.display = 'none';
						headerAvatar.onerror = () => {
							// Если изображение не загрузилось - показываем иконку
							console.warn( '⚠️ MAIN: Ошибка загрузки аватара, показываем иконку' );
							headerAvatar.style.display = 'none';
							headerAvatarIcon.style.display = 'block';
						};
						console.log( '🖼️ MAIN: Отображается аватар пользователя' );
					} else {
						// Аватара нет - показываем стандартную иконку
						headerAvatar.style.display = 'none';
						headerAvatarIcon.style.display = 'block';
						console.log( '🖼️ MAIN: Аватар отсутствует, показываем иконку по умолчанию' );
					}
				}
			} catch ( parseError ) {
				// Ошибка парсинга JSON - данные повреждены
				console.error( '❌ MAIN: Ошибка парсинга данных пользователя:', parseError );
				this._resetToDefaultAuth( authBtn, authText, headerAvatar, headerAvatarIcon );
			}
		} else {
			// ===== ПОЛЬЗОВАТЕЛЬ НЕ АВТОРИЗОВАН =====
			this._resetToDefaultAuth( authBtn, authText, headerAvatar, headerAvatarIcon );
		}
	} catch ( error ) {
		console.error( '❌ MAIN: Критическая ошибка при обновлении аватара:', error );
	}
}

/**
 * Сбрасывает элементы шапки к состоянию "не авторизован"
 * Выделено в отдельную функцию чтобы избежать дублирования кода
 * 
 * @param {HTMLElement} authBtn - ссылка кнопки авторизации
 * @param {HTMLElement} authText - элемент с текстом
 * @param {HTMLElement} headerAvatar - элемент с аватаром
 * @param {HTMLElement} headerAvatarIcon - элемент с иконкой
 * @private
 */
function _resetToDefaultAuth( authBtn, authText, headerAvatar, headerAvatarIcon ) {
	// Скрываем аватар, показываем иконку
	if ( headerAvatar ) headerAvatar.style.display = 'none';
	if ( headerAvatarIcon ) headerAvatarIcon.style.display = 'block';

	// Устанавливаем текст и ссылку для неавторизованного пользователя
	if ( authText ) authText.textContent = 'Войти';
	if ( authBtn ) {
		authBtn.href = '/pages html/login.html';
		authBtn.title = 'Войти в аккаунт';
	}

	console.log( '👤 MAIN: Отображается состояние "Войти"' );
}

// ============================================================================
// 3. ОБНОВЛЕНИЕ ССЫЛКИ В ПОДВАЛЕ
// ============================================================================

/**
 * Обновляет ссылку "Мой аккаунт" в подвале сайта
 * 
 * Особенности:
 * - Безопасно обновляет DOM через textContent и createTextNode
 * - Сохраняет иконку Font Awesome нетронутой
 * - Не использует innerHTML для предотвращения XSS
 * 
 * Состояния:
 * - Авторизован:  "👤 Мой профиль" -> /pages html/profile.html
 * - Не авторизован: "👤 Войти / Регистрация" -> /pages html/login.html
 */
function updateFooterProfileLink() {
	try {
		// Ищем ссылку в подвале (первый элемент списка profile-links)
		const profileLink = document.querySelector( '.footer-column .profile-links li:first-child a' );

		if ( !profileLink ) {
			console.log( 'ℹ️ MAIN: Ссылка на профиль в подвале не найдена (возможно, другой макет)' );
			return;
		}

		const currentUser = localStorage.getItem( 'komori_current_user' );

		// Находим иконку, чтобы сохранить её при обновлении
		const icon = profileLink.querySelector( 'i' );

		if ( currentUser ) {
			// ===== ПОЛЬЗОВАТЕЛЬ АВТОРИЗОВАН =====
			try {
				const user = JSON.parse( currentUser );
				profileLink.href = '/pages html/login.html';
				profileLink.title = 'Перейти в профиль';

				// Безопасное обновление содержимого ссылки
				this._updateLinkContent( profileLink, icon, 'Мой профиль' );

				console.log( '🔗 MAIN: Ссылка в подвале -> "Мой профиль" для:', user.name );
			} catch ( e ) {
				// Ошибка парсинга - показываем состояние входа
				profileLink.href = '/pages html/login.html';
				profileLink.title = 'Войти или зарегистрироваться';
				this._updateLinkContent( profileLink, icon, 'Войти / Регистрация' );

				console.warn( '⚠️ MAIN: Ошибка парсинга, ссылка сброшена на вход' );
			}
		} else {
			// ===== ПОЛЬЗОВАТЕЛЬ НЕ АВТОРИЗОВАН =====
			profileLink.href = '/pages html/login.html';
			profileLink.title = 'Войти или зарегистрироваться';
			this._updateLinkContent( profileLink, icon, 'Войти / Регистрация' );

			console.log( '🔗 MAIN: Ссылка в подвале -> "Войти / Регистрация"' );
		}
	} catch ( error ) {
		console.error( '❌ MAIN: Ошибка при обновлении ссылки в подвале:', error );
	}
}

/**
 * Безопасно обновляет содержимое ссылки, сохраняя иконку
 * Использует DOM-методы вместо innerHTML для безопасности
 * 
 * @param {HTMLElement} link - элемент ссылки для обновления
 * @param {HTMLElement} icon - элемент иконки, который нужно сохранить
 * @param {string} text - новый текст ссылки
 * @private
 */
function _updateLinkContent( link, icon, text ) {
	// Очищаем содержимое ссылки
	while ( link.firstChild ) {
		link.removeChild( link.firstChild );
	}

	// Добавляем иконку (если она была)
	if ( icon ) {
		link.appendChild( icon.cloneNode( true ) ); // Клонируем чтобы избежать проблем с перемещением
	}

	// Добавляем пробел и текст
	link.appendChild( document.createTextNode( ' ' + text ) );
}

// ============================================================================
// 4. ОСНОВНАЯ ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
// ============================================================================

/**
 * Главный обработчик загрузки DOM
 * Инициализирует все модули и обработчики
 * 
 * Порядок важен:
 * 1. Базовые утилиты (скролл, модальные окна)
 * 2. UI обновления (счетчики, аватар)
 * 3. Интерактивные элементы (формы, анимации)
 * 4. Доступность (в последнюю очередь)
 */
document.addEventListener( 'DOMContentLoaded', function () {
	console.log( '🚀 MAIN: DOM полностью загружен, начинаю инициализацию...' );

	// ===== 1. БАЗОВЫЕ УТИЛИТЫ =====
	initSmoothScroll();      // Плавная прокрутка для якорных ссылок
	initModalHandlers();     // Закрытие модальных окон

	// ===== 2. ОБНОВЛЕНИЕ UI =====
	updateCopyrightYear();   // Год в футере

	// Обновляем счетчики только если API доступен
	if ( window.API && typeof window.API.updateHeaderCounters === 'function' ) {
		API.updateHeaderCounters();
		console.log( '🔢 MAIN: Счетчики корзины и избранного обновлены' );
	} else {
		console.warn( '⚠️ MAIN: API.updateHeaderCounters недоступен' );
	}

	updateHeaderAvatar();    // Аватар пользователя
	updateFooterProfileLink(); // Ссылка в подвале

	// ===== 3. ИНТЕРАКТИВНЫЕ ЭЛЕМЕНТЫ =====
	initFormValidation();    // Валидация форм
	initScrollAnimations();  // Анимации появления при скролле

	// ===== 4. ДОСТУПНОСТЬ =====
	enhanceAccessibility();  // Улучшение для клавиатуры и скринридеров

	console.log( '✅ MAIN: Все модули успешно инициализированы' );
} );

// ============================================================================
// 5. ПЛАВНЫЙ СКРОЛЛ ДЛЯ ЯКОРНЫХ ССЫЛОК
// ============================================================================

/**
 * Инициализирует плавную прокрутку для внутренних ссылок
 * 
 * Какие ссылки обрабатываются:
 * - <a href="#section"> (якорь на этой же странице)
 * - <a href="#top"> (возврат наверх)
 * 
 * Какие игнорируются:
 * - <a href="#"> (пустая ссылка)
 * - <a href="page.html#section"> (ссылка на другую страницу)
 * 
 * Особенности:
 * - Учитывает высоту фиксированного хедера
 * - Закрывает мобильное меню после клика
 */
function initSmoothScroll() {
	// Находим все якорные ссылки (кроме пустых)
	const anchorLinks = document.querySelectorAll( 'a[href^="#"]:not([href="#"])' );

	if ( anchorLinks.length === 0 ) {
		console.log( 'ℹ️ MAIN: Якорные ссылки не найдены на странице' );
		return;
	}

	console.log( `🔗 MAIN: Найдено ${anchorLinks.length} якорных ссылок для плавного скролла` );

	anchorLinks.forEach( anchor => {
		anchor.addEventListener( 'click', function ( e ) {
			const targetId = this.getAttribute( 'href' );

			// Ищем целевой элемент
			const targetElement = document.querySelector( targetId );

			if ( targetElement ) {
				// Предотвращаем стандартный переход
				e.preventDefault();

				// Вычисляем позицию с учетом фиксированного хедера
				const header = document.querySelector( 'header' );
				const headerHeight = header ? header.offsetHeight : 0;
				const targetPosition = targetElement.offsetTop - headerHeight - 20; // 20px дополнительный отступ

				// Плавная прокрутка
				window.scrollTo( {
					top: targetPosition,
					behavior: 'smooth'
				} );

				console.log( `📜 MAIN: Плавный скролл к "${targetId}" (позиция: ${targetPosition}px)` );

				// Закрываем мобильное меню если оно открыто
				closeMobileMenu();
			} else {
				console.warn( `⚠️ MAIN: Целевой элемент "${targetId}" не найден на странице` );
			}
		} );
	} );
}

/**
 * Закрывает мобильное меню (бургер-меню)
 * Безопасно проверяет существование элементов перед манипуляцией
 */
function closeMobileMenu() {
	// Проверяем, что мы на мобильном разрешении
	if ( window.innerWidth <= 768 ) {
		const mainNav = document.getElementById( 'mainNav' );
		const burgerMenu = document.getElementById( 'burgerMenu' );
		const navOverlay = document.getElementById( 'navOverlay' );

		// Проверяем, открыто ли меню
		if ( mainNav && mainNav.classList.contains( 'active' ) ) {
			mainNav.classList.remove( 'active' );

			if ( burgerMenu ) {
				burgerMenu.classList.remove( 'active' );
			}

			if ( navOverlay ) {
				navOverlay.classList.remove( 'active' );
			}

			// Возвращаем прокрутку страницы
			document.body.style.overflow = '';

			console.log( '🍔 MAIN: Мобильное меню закрыто' );
		}
	}
}

// ============================================================================
// 6. ОБНОВЛЕНИЕ ГОДА В ФУТЕРЕ
// ============================================================================

/**
 * Автоматически обновляет год в копирайте футера
 * 
 * Пример:
 * Было:  "© 2024 Комори. Все права защищены."
 * Стало: "© 2025 Комори. Все права защищены."
 * 
 * Безопасность:
 * - Использует textContent вместо innerHTML
 * - Заменяет только первое вхождение 4 цифр подряд
 */
function updateCopyrightYear() {
	const copyright = document.querySelector( '.copyright' );

	if ( !copyright ) {
		return; // Элемент не найден - молча выходим
	}

	const currentYear = new Date().getFullYear();

	// Заменяем любой 4-значный год на текущий (безопасно через textContent)
	const oldText = copyright.textContent;
	const newText = oldText.replace( /\b\d{4}\b/, currentYear );

	if ( oldText !== newText ) {
		copyright.textContent = newText;
		console.log( `📅 MAIN: Год в копирайте обновлен: ${oldText.match( /\d{4}/ )} -> ${currentYear}` );
	}
}

// ============================================================================
// 7. ВАЛИДАЦИЯ ФОРМ
// ============================================================================

// Хранилище для валидаторов (нужно для очистки при SPA-переходах)
const formValidators = [];

/**
 * Инициализирует валидацию всех форм на странице
 * 
 * Проверки:
 * - Все поля с атрибутом [required] должны быть заполнены
 * - При ошибке поле подсвечивается красным
 * - Подсветка убирается при начале ввода
 * 
 * Уведомления:
 * - Использует API.showNotification если доступен
 * - Иначе выводит alert (менее красиво, но работает)
 */
function initFormValidation() {
	const forms = document.querySelectorAll( 'form' );

	if ( forms.length === 0 ) {
		console.log( 'ℹ️ MAIN: Формы на странице не найдены' );
		return;
	}

	console.log( `📝 MAIN: Найдено ${forms.length} форм, добавляю валидацию` );

	forms.forEach( ( form, formIndex ) => {
		// Создаем функцию-валидатор для этой формы
		const validator = function ( e ) {
			const requiredFields = form.querySelectorAll( '[required]' );
			let isValid = true;
			let firstErrorField = null;

			// Проверяем все обязательные поля
			requiredFields.forEach( field => {
				if ( !field.value.trim() ) {
					isValid = false;

					// Подсвечиваем поле красным
					field.style.borderColor = '#ff4757';
					field.style.boxShadow = '0 0 0 2px rgba(255, 71, 87, 0.2)';

					// Запоминаем первое ошибочное поле для фокуса
					if ( !firstErrorField ) {
						firstErrorField = field;
					}

					// Убираем подсветку при начале ввода
					field.addEventListener( 'input', function () {
						this.style.borderColor = '';
						this.style.boxShadow = '';
					}, { once: true } );

					console.warn( `⚠️ MAIN: Поле "${field.name || field.id || 'без имени'}" не заполнено` );
				}
			} );

			// Если форма невалидна
			if ( !isValid ) {
				e.preventDefault(); // Блокируем отправку

				// Фокусируемся на первом ошибочном поле
				if ( firstErrorField ) {
					firstErrorField.focus();
				}

				// Показываем уведомление об ошибке
				if ( window.API && typeof window.API.showNotification === 'function' ) {
					window.API.showNotification(
						'Пожалуйста, заполните все обязательные поля',
						'warning'
					);
				} else {
					// Fallback если API недоступен
					alert( 'Пожалуйста, заполните все обязательные поля.' );
				}

				console.log( '❌ MAIN: Форма не отправлена - есть незаполненные поля' );
			} else {
				console.log( '✅ MAIN: Форма валидна, отправка разрешена' );
			}
		};

		// Прикрепляем валидатор к форме
		form.addEventListener( 'submit', validator );

		// Сохраняем ссылки для возможной очистки
		formValidators.push( { form, validator } );
	} );
}

// ============================================================================
// 8. АНИМАЦИИ ПРИ СКРОЛЛЕ
// ============================================================================

let scrollObserver = null; // Храним ссылку для очистки

/**
 * Инициализирует анимации появления элементов при скролле
 * 
 * Как использовать:
 * Добавьте класс "animate-on-scroll" к элементу в HTML:
 * <div class="animate-on-scroll">...</div>
 * 
 * При попадании в область видимости добавится класс "animated"
 * 
 * Настройки:
 * - threshold: 0.1 = срабатывает когда 10% элемента видно
 * - rootMargin: '-50px' = срабатывает на 50px раньше
 */
function initScrollAnimations() {
	// Находим все элементы для анимации
	const animatedElements = document.querySelectorAll( '.animate-on-scroll' );

	if ( animatedElements.length === 0 ) {
		console.log( 'ℹ️ MAIN: Элементы с анимацией (.animate-on-scroll) не найдены' );
		return;
	}

	console.log( `✨ MAIN: Найдено ${animatedElements.length} элементов для анимации` );

	// Отключаем предыдущий наблюдатель если был
	if ( scrollObserver ) {
		scrollObserver.disconnect();
		console.log( '🔄 MAIN: Предыдущий наблюдатель анимаций отключен' );
	}

	// Создаем новый наблюдатель
	scrollObserver = new IntersectionObserver( ( entries ) => {
		entries.forEach( entry => {
			if ( entry.isIntersecting ) {
				// Элемент появился в области видимости
				entry.target.classList.add( 'animated' );

				// Прекращаем наблюдение за этим элементом (анимация срабатывает один раз)
				scrollObserver.unobserve( entry.target );

				console.log( `✨ MAIN: Анимация запущена для:`, entry.target );
			}
		} );
	}, {
		threshold: 0.1,        // Срабатывает при видимости 10% элемента
		rootMargin: '0px 0px -50px 0px' // Небольшой оффсет для раннего срабатывания
	} );

	// Начинаем наблюдение за всеми элементами
	animatedElements.forEach( ( element, index ) => {
		scrollObserver.observe( element );
		console.log( `👁️ MAIN: Наблюдение #${index + 1}:`, element.tagName, element.className );
	} );
}

// ============================================================================
// 9. УЛУЧШЕНИЕ ДОСТУПНОСТИ
// ============================================================================

/**
 * Улучшает доступность сайта для людей с ограниченными возможностями
 * 
 * Что делает:
 * - Добавляет обработку Enter/Space для элементов с role="button"
 * - НЕ добавляет outline через JS (используется CSS :focus-visible)
 * - Отслеживает способ навигации (мышь vs клавиатура)
 */
function enhanceAccessibility() {
	// Отслеживаем, использует ли пользователь клавиатуру
	let usingKeyboard = false;

	// Слушаем нажатие Tab - верный признак клавиатурной навигации
	document.addEventListener( 'keydown', ( e ) => {
		if ( e.key === 'Tab' ) {
			usingKeyboard = true;
			// Добавляем класс к body для CSS-стилей
			document.body.classList.add( 'keyboard-navigation' );
			console.log( '⌨️ MAIN: Обнаружена навигация с клавиатуры' );
		}
	}, { passive: true } );

	// Слушаем клик мыши - сбрасываем флаг клавиатуры
	document.addEventListener( 'mousedown', () => {
		usingKeyboard = false;
		document.body.classList.remove( 'keyboard-navigation' );
	}, { passive: true } );

	// Обрабатываем элементы с role="button" (нестандартные кнопки)
	const roleButtons = document.querySelectorAll( '[role="button"]' );

	if ( roleButtons.length > 0 ) {
		console.log( `♿ MAIN: Найдено ${roleButtons.length} элементов с role="button"` );

		roleButtons.forEach( button => {
			// Добавляем обработку Enter и Space
			button.addEventListener( 'keydown', function ( e ) {
				if ( e.key === 'Enter' || e.key === ' ' ) {
					e.preventDefault();
					this.click();
					console.log( `⌨️ MAIN: Элемент активирован клавишей "${e.key}"` );
				}
			} );

			// Добавляем tabindex если его нет (чтобы элемент был доступен с клавиатуры)
			if ( !button.hasAttribute( 'tabindex' ) ) {
				button.setAttribute( 'tabindex', '0' );
			}
		} );
	}

	// Добавляем aria-label к ссылкам без текста (иконки)
	document.querySelectorAll( 'a:empty, a img:only-child' ).forEach( link => {
		if ( !link.getAttribute( 'aria-label' ) ) {
			const text = link.getAttribute( 'title' ) || 'Ссылка';
			link.setAttribute( 'aria-label', text );
		}
	} );

	// Обеспечиваем достаточный контраст для фокуса
	if ( usingKeyboard ) {
		document.body.classList.add( 'keyboard-navigation' );
	}

	console.log( '♿ MAIN: Доступность улучшена (используется CSS :focus-visible)' );
	console.log( '💡 MAIN: Для стилизации фокуса используйте:' );
	console.log( '   :focus-visible { outline: 2px solid #ff6b6b; }' );
}

// ============================================================================
// 10. ОТСТУП ДЛЯ ОСНОВНОГО КОНТЕНТА (МОБИЛЬНЫЕ)
// ============================================================================

let headerOffsetHandler = null; // Храним для очистки

/**
 * Устанавливает отступ для main под фиксированным хедером
 * 
 * Актуально только для мобильных устройств (ширина < 993px)
 * На десктопах хедер не фиксированный, отступ не нужен
 * 
 * Автоматически пересчитывается при изменении размера окна
 */
function initHeaderOffset() {
	const header = document.querySelector( 'header' );
	const main = document.querySelector( 'main' );

	// Если нет header или main - выходим
	if ( !header || !main ) {
		console.warn( '⚠️ MAIN: Не найдены header или main для установки отступа' );
		return;
	}

	/**
	 * Обновляет отступ в зависимости от ширины экрана
	 */
	function updateOffset() {
		const isMobile = window.innerWidth < 993;

		if ( isMobile ) {
			const headerHeight = header.offsetHeight;
			main.style.marginTop = headerHeight + 'px';
			console.log( `📱 MAIN: Мобильный режим, отступ: ${headerHeight}px` );
		} else {
			main.style.marginTop = '';
			console.log( '🖥️ MAIN: Десктопный режим, отступ убран' );
		}
	}

	// Устанавливаем начальное значение
	updateOffset();

	// Сохраняем обработчик для возможной очистки
	headerOffsetHandler = updateOffset;

	// Обновляем при изменении размера окна
	window.addEventListener( 'resize', updateOffset );

	console.log( '📐 MAIN: Отслеживание высоты хедера настроено' );
}

// ============================================================================
// 11. МОДАЛЬНЫЕ ОКНА
// ============================================================================

/**
 * Инициализирует обработчики для модальных окон
 * 
 * Способы закрытия:
 * 1. Клик по оверлею (темному фону)
 * 2. Нажатие клавиши Escape
 * 3. Клик по кнопке закрытия (.modal-close)
 */
function initModalHandlers() {
	// Закрытие по клику на оверлей
	document.addEventListener( 'click', ( e ) => {
		// Проверяем, что клик был именно по оверлею, а не по содержимому
		if ( e.target.classList.contains( 'modal-overlay' ) &&
			e.target.classList.contains( 'active' ) ) {
			closeModal( e.target );
		}
	} );

	// Закрытие по кнопке закрытия
	document.addEventListener( 'click', ( e ) => {
		const closeBtn = e.target.closest( '.modal-close' );
		if ( closeBtn ) {
			const modal = closeBtn.closest( '.modal-overlay' );
			if ( modal ) {
				closeModal( modal );
			}
		}
	} );

	// Закрытие по Escape
	document.addEventListener( 'keydown', ( e ) => {
		if ( e.key === 'Escape' ) {
			const activeModal = document.querySelector( '.modal-overlay.active' );
			if ( activeModal ) {
				closeModal( activeModal );
				console.log( '⌨️ MAIN: Модальное окно закрыто клавишей Escape' );
			}
		}
	} );

	console.log( '🪟 MAIN: Обработчики модальных окон настроены' );
}

/**
 * Закрывает модальное окно
 * @param {HTMLElement} modal - элемент модального окна (.modal-overlay)
 */
function closeModal( modal ) {
	if ( !modal ) return;

	modal.classList.remove( 'active' );
	document.body.style.overflow = ''; // Возвращаем прокрутку

	// Генерируем событие для других модулей
	modal.dispatchEvent( new CustomEvent( 'modalClosed' ) );

	console.log( '🪟 MAIN: Модальное окно закрыто' );
}

// ============================================================================
// 12. ГЛОБАЛЬНЫЕ СЛУШАТЕЛИ СОБЫТИЙ
// ============================================================================

/**
 * Слушаем изменения localStorage в других вкладках
 * Если пользователь вышел в одной вкладке - обновляем все остальные
 */
window.addEventListener( 'storage', function ( e ) {
	if ( e.key === 'komori_current_user' ) {
		console.log( '🔄 MAIN: Данные пользователя изменены в другой вкладке' );
		updateHeaderAvatar();
		updateFooterProfileLink();

		if ( window.API && typeof window.API.updateHeaderCounters === 'function' ) {
			window.API.updateHeaderCounters();
		}
	}
} );

/**
 * Слушаем кастомное событие обновления пользователя
 * Можно вызвать из любого модуля:
 * window.dispatchEvent(new CustomEvent('userUpdated'));
 */
window.addEventListener( 'userUpdated', function () {
	console.log( '🔄 MAIN: Получено событие userUpdated' );
	updateHeaderAvatar();
	updateFooterProfileLink();

	if ( window.API && typeof window.API.updateHeaderCounters === 'function' ) {
		window.API.updateHeaderCounters();
	}
} );

/**
 * Слушаем событие обновления корзины (для совместимости)
 */
window.addEventListener( 'cartUpdated', function () {
	console.log( '🛒 MAIN: Получено событие cartUpdated' );
	if ( window.API && typeof window.API.updateHeaderCounters === 'function' ) {
		window.API.updateHeaderCounters();
	}
} );

// ============================================================================
// 13. ОЧИСТКА РЕСУРСОВ (ДЛЯ SPA-ПРИЛОЖЕНИЙ)
// ============================================================================

/**
 * Глобальная функция очистки всех ресурсов main.js
 * Полезна при переходе между страницами в SPA
 * 
 * Вызов: window.cleanupMain()
 */
window.cleanupMain = function () {
	console.log( '🧹 MAIN: Очистка ресурсов...' );

	// Очищаем наблюдатель анимаций
	if ( scrollObserver ) {
		scrollObserver.disconnect();
		scrollObserver = null;
		console.log( '🧹 MAIN: Наблюдатель анимаций отключен' );
	}

	// Очищаем валидаторы форм
	formValidators.forEach( ( { form, validator } ) => {
		form.removeEventListener( 'submit', validator );
	} );
	formValidators.length = 0;
	console.log( '🧹 MAIN: Валидаторы форм удалены' );

	// Очищаем обработчик ресайза
	if ( headerOffsetHandler ) {
		window.removeEventListener( 'resize', headerOffsetHandler );
		headerOffsetHandler = null;
		console.log( '🧹 MAIN: Обработчик ресайза удален' );
	}

	console.log( '✅ MAIN: Все ресурсы очищены' );
};

// ============================================================================
// 14. ЗАПУСК ОТЛОЖЕННЫХ ИНИЦИАЛИЗАЦИЙ
// ============================================================================

/**
 * Инициализация отступа хедера
 * Запускается сразу или после загрузки DOM
 */
if ( document.readyState === 'loading' ) {
	// DOM еще грузится - ждем
	document.addEventListener( 'DOMContentLoaded', initHeaderOffset );
} else {
	// DOM уже загружен - запускаем сразу
	initHeaderOffset();
}

// ============================================================================
// 15. ЭКСПОРТ ДЛЯ ОТЛАДКИ
// ============================================================================

/**
 * Вспомогательные функции доступные из консоли браузера
 * Для отладки: window.MAIN.функция()
 */
window.MAIN = {
	getSiteRoot,
	updateHeaderAvatar,
	updateFooterProfileLink,
	closeMobileMenu,
	updateCopyrightYear,
	enhanceAccessibility,
	cleanup: window.cleanupMain,

	// Информация о модуле
	version: '2.0.0',
	loaded: new Date().toISOString()
};

console.log( '✅ MAIN.JS: Загружен и готов к работе' );
console.log( '💡 MAIN: Для отладки используйте window.MAIN' );
console.log( '   window.MAIN.cleanup() - очистить ресурсы' );
console.log( '   window.MAIN.version - версия модуля' );