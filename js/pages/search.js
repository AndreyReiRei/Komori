/**
 * ============================================
 * МОДУЛЬ ПОИСКА ПО САЙТУ
 * ============================================
 * 
 * Описание: Осуществляет поиск по всем товарам из store.js
 * Функционал:
 * - Поиск по названию, категории, описанию, артикулу, статусам
 * - Поиск по отдельным словам (каждое слово запроса ищется независимо)
 * - Результаты в модальном окне с подсветкой совпадений
 * - Дебаунс при вводе текста (оптимизация производительности)
 * - Популярные поисковые запросы
 * - Добавление товара в корзину прямо из результатов поиска
 * - Навигация с клавиатуры (Escape для закрытия)
 * - Закрытие по клику вне модального окна
 * 
 * Зависимости: window.store (store.js)
 * Автор: Komori Team
 * Версия: 2.0
 */

document.addEventListener( 'DOMContentLoaded', function () {

	// ============================================
	// 1. СОЗДАНИЕ МОДАЛЬНОГО ОКНА И ПОЛУЧЕНИЕ ССЫЛОК НА DOM-ЭЛЕМЕНТЫ
	// ============================================

	const searchBtn = document.getElementById( 'searchBtn' );

	// Создаём модальное окно поиска, если его ещё нет в DOM
	createSearchModal();

	// Получаем ссылки на все необходимые элементы
	const searchModal = document.getElementById( 'searchModal' );
	const closeSearch = document.querySelector( '.close-search' );
	const searchInput = document.getElementById( 'searchInput' );
	const searchForm = document.getElementById( 'searchForm' );
	const searchResults = document.getElementById( 'searchResults' );

	// ============================================
	// 2. ОБРАБОТЧИКИ СОБЫТИЙ ДЛЯ ОТКРЫТИЯ/ЗАКРЫТИЯ ПОИСКА
	// ============================================

	// Открытие поиска по клику на кнопку поиска в хедере
	if ( searchBtn ) {
		searchBtn.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			openSearch();
		} );
	}

	// Закрытие поиска по клику на крестик
	if ( closeSearch ) {
		closeSearch.addEventListener( 'click', closeSearchFunc );
	}

	// Закрытие поиска по клику вне модального окна (на тёмный фон)
	window.addEventListener( 'click', function ( e ) {
		if ( searchModal && e.target === searchModal ) {
			closeSearchFunc();
		}
	} );

	// Закрытие поиска по нажатию клавиши Escape
	document.addEventListener( 'keydown', function ( e ) {
		if ( e.key === 'Escape' && searchModal && searchModal.style.display === 'flex' ) {
			closeSearchFunc();
		}
	} );

	// ============================================
	// 3. ОБРАБОТЧИКИ СОБЫТИЙ ДЛЯ ФОРМЫ ПОИСКА
	// ============================================

	// Отправка формы поиска по нажатию Enter или кнопки "Найти"
	if ( searchForm ) {
		searchForm.addEventListener( 'submit', function ( e ) {
			e.preventDefault();
			const query = searchInput.value.trim();
			if ( query ) {
				performSearch( query );
			}
		} );
	}

	// Поиск при вводе текста с задержкой 300мс (debounce)
	// Это предотвращает слишком частые поисковые запросы при быстром наборе текста
	if ( searchInput ) {
		let searchTimeout;
		searchInput.addEventListener( 'input', function ( e ) {
			// Сбрасываем предыдущий таймаут при каждом новом вводе символа
			clearTimeout( searchTimeout );

			const query = e.target.value.trim();

			// Поиск выполняется только если введено 2 или более символов
			if ( query.length >= 2 ) {
				// Устанавливаем новый таймаут на 300мс
				searchTimeout = setTimeout( () => {
					performSearch( query );
				}, 300 );
			} else {
				// Если поле пустое или содержит только 1 символ — очищаем результаты
				clearResults();
			}
		} );
	}

	// ============================================
	// 4. ФУНКЦИИ УПРАВЛЕНИЯ МОДАЛЬНЫМ ОКНОМ
	// ============================================

	/**
	 * Открывает модальное окно поиска
	 * - Показывает окно
	 * - Устанавливает фокус на поле ввода через 300мс (после анимации появления)
	 * - Блокирует прокрутку основной страницы чтобы избежать скролла фона
	 * - Очищает предыдущие результаты поиска и поле ввода
	 */
	function openSearch() {
		if ( searchModal ) {
			searchModal.style.display = 'flex';

			// Задержка перед фокусом нужна для завершения CSS-анимации появления окна
			setTimeout( () => {
				if ( searchInput ) searchInput.focus();
			}, 300 );

			// Блокируем прокрутку основной страницы
			// position: fixed и width: 100% предотвращают смещение контента
			document.body.style.overflow = 'hidden';
			document.body.style.position = 'fixed';
			document.body.style.width = '100%';

			// Очищаем результаты предыдущего поиска
			clearResults();
			if ( searchInput ) searchInput.value = '';
		}
	}

	/**
	 * Закрывает модальное окно поиска
	 * - Скрывает окно
	 * - Возвращает прокрутку основной страницы
	 * - Очищает результаты и поле ввода
	 */
	function closeSearchFunc() {
		if ( searchModal ) {
			searchModal.style.display = 'none';

			// Возвращаем нормальную прокрутку страницы
			document.body.style.overflow = '';
			document.body.style.position = '';
			document.body.style.width = '';

			// Очищаем всё для следующего открытия
			clearResults();
			if ( searchInput ) searchInput.value = '';
		}
	}

	/**
	 * Очищает результаты поиска и скрывает связанные элементы
	 * Вызывается при закрытии окна или когда поле поиска пустое
	 */
	function clearResults() {
		const searchResults = document.getElementById( 'searchResults' );
		if ( searchResults ) {
			searchResults.innerHTML = '';
			searchResults.classList.remove( 'has-results' );
		}

		const noResultsMsg = document.getElementById( 'noResultsMessage' );
		if ( noResultsMsg ) {
			noResultsMsg.style.display = 'none';
		}

		const resultsCount = document.getElementById( 'resultsCount' );
		if ( resultsCount ) {
			resultsCount.style.display = 'none';
		}
	}

	// ============================================
	// 5. ЛОГИКА ПОИСКА ТОВАРОВ
	// ============================================

	/**
	 * Выполняет поиск товаров по запросу
	 * @param {string} query - Поисковый запрос
	 */
	function performSearch( query ) {
		console.log( 'Поиск по запросу:', query );

		// Проверяем, что хранилище товаров доступно
		if ( !window.store || !window.store.products ) {
			console.warn( 'Store не инициализирован или нет товаров' );
			showNoResults( query );
			return;
		}

		const allProducts = window.store.products || [];
		const searchResultsList = searchProducts( query, allProducts );
		displaySearchResults( searchResultsList, query );
	}

	/**
	 * Ищет товары по запросу
	 * 
	 * Алгоритм поиска:
	 * 1. Разбивает запрос на отдельные слова
	 * 2. Для каждого товара формирует единую строку из всех полей для поиска
	 * 3. Проверяет, что КАЖДОЕ слово запроса встречается в этой строке
	 * 4. Если все слова найдены — товар включается в результаты
	 * 
	 * Такой подход позволяет находить товары даже если слова запроса
	 * распределены по разным полям. Например, запрос "чай матча" найдёт товар
	 * "Матча-латте" в категории "Японский чай", потому что слово "матча"
	 * есть в названии, а "чай" — в категории.
	 * 
	 * @param {string} query - Поисковый запрос пользователя
	 * @param {Array} products - Массив всех товаров
	 * @returns {Array} - Отфильтрованный массив подходящих товаров
	 */
	function searchProducts( query, products ) {
		// Приводим запрос к нижнему регистру и разбиваем на отдельные слова
		// split(/\s+/) разбивает по любым пробельным символам (пробел, табуляция, перенос строки)
		const queryWords = query.toLowerCase().trim().split( /\s+/ );

		// Фильтруем товары
		return products.filter( product => {

			// Формируем единую строку из всех полей товара для поиска
			// Это позволяет искать слова запроса в разных полях одновременно
			const searchableText = [
				product.name || '',                                    // Название товара
				product.description || '',                             // Описание товара
				getCategoryName( product.category ) || '',             // Название категории на русском
				product.sku || '',                                     // Артикул товара
				product.isNew ? 'новинка' : '',                        // Статус "Новинка"
				product.isHit ? 'хит продаж' : ''                      // Статус "Хит"
			].join( ' ' ).toLowerCase();                               // Объединяем через пробел и приводим к нижнему регистру

			// Проверяем, что КАЖДОЕ слово из запроса встречается в тексте товара
			// Метод every() возвращает true только если ВСЕ элементы удовлетворяют условию
			return queryWords.every( word => searchableText.includes( word ) );
		} );
	}

	/**
	 * Получает русское название категории по её коду
	 * Использует категории из store.js если доступны, иначе из локального объекта
	 * 
	 * @param {string} categoryCode - Код категории (например 'tea', 'figures')
	 * @returns {string} - Русское название категории (например 'Японский чай')
	 */
	function getCategoryName( categoryCode ) {
		// Пытаемся получить категории из глобального хранилища
		if ( window.store && window.store.categories ) {
			return window.store.categories[categoryCode] || categoryCode;
		}

		// Резервный объект с категориями на случай если store недоступен
		const categories = {
			'figures': 'Аниме фигурки',
			'tea': 'Японский чай',
			'sweets': 'Азиатские сладости',
			'manga': 'Манга и книги',
			'clothing': 'Аниме одежда',
			'tableware': 'Японская посуда',
			'games': 'Японские игры',
			'stationery': 'Канцелярия кавай',
			'cosmetics': 'Косметика из Азии',
			'decor': 'Азиатский декор',
			'anime': 'Аниме на дисках',
			'music': 'Азиатская музыка',
			'other': 'Другое'
		};
		return categories[categoryCode] || categoryCode;
	}

	// ============================================
	// 6. ОТОБРАЖЕНИЕ РЕЗУЛЬТАТОВ ПОИСКА
	// ============================================

	/**
	 * Отображает результаты поиска в модальном окне
	 * 
	 * @param {Array} products - Массив найденных товаров
	 * @param {string} query - Поисковый запрос (нужен для подсветки совпадений)
	 */
	function displaySearchResults( products, query ) {
		const searchResults = document.getElementById( 'searchResults' );
		const noResultsMsg = document.getElementById( 'noResultsMessage' );
		const resultsCount = document.getElementById( 'resultsCount' );

		if ( !searchResults ) return;

		// Очищаем контейнер результатов
		searchResults.innerHTML = '';

		// Если товаров не найдено — показываем сообщение
		if ( products.length === 0 ) {
			showNoResults( query );
			return;
		}

		// Скрываем сообщение об отсутствии результатов
		if ( noResultsMsg ) {
			noResultsMsg.style.display = 'none';
		}

		// Добавляем класс для стилизации контейнера с результатами
		searchResults.classList.add( 'has-results' );

		// Показываем количество найденных товаров с правильным склонением
		if ( resultsCount ) {
			resultsCount.textContent = `Найдено ${products.length} товар${getDeclension( products.length )}`;
			resultsCount.style.display = 'block';
		}

		// Создаём карточку для каждого найденного товара
		products.forEach( product => {
			const resultItem = createSearchResultItem( product, query );
			searchResults.appendChild( resultItem );
		} );
	}

	/**
	 * Возвращает правильное склонение для слова "товар" после числа
	 * Примеры: 1 товар, 2 товара, 5 товаров, 21 товар, 22 товара
	 * 
	 * @param {number} count - Количество товаров
	 * @returns {string} - Окончание для слова "товар" (пусто, "а", "ов")
	 */
	function getDeclension( count ) {
		// Особый случай: числа от 11 до 14 всегда используют "товаров"
		if ( count % 10 === 1 && count % 100 !== 11 ) return '';
		if ( count % 10 >= 2 && count % 10 <= 4 && ( count % 100 < 10 || count % 100 >= 20 ) ) return 'а';
		return 'ов';
	}

	/**
	 * Создаёт DOM-элемент карточки товара для результатов поиска
	 * 
	 * Структура карточки:
	 * - Изображение товара
	 * - Категория (с подсветкой совпадений)
	 * - Название товара (с подсветкой совпадений)
	 * - Артикул
	 * - Цена (текущая и старая если есть скидка)
	 * - Статус наличия
	 * - Кнопки "Просмотр" и "В корзину"
	 * 
	 * @param {Object} product - Объект товара
	 * @param {string} query - Поисковый запрос для подсветки совпадений
	 * @returns {HTMLElement} - DOM-элемент карточки товара
	 */
	function createSearchResultItem( product, query ) {
		const item = document.createElement( 'div' );
		item.className = 'search-result-item';
		item.dataset.id = product.id;

		// Форматируем цены в читаемый вид
		const formattedPrice = formatPrice( product.price );
		const oldPrice = product.oldPrice ? formatPrice( product.oldPrice ) : null;

		// Получаем URL страницы товара
		const productUrl = getProductUrl( product );

		// Подсвечиваем совпадения в названии и категории
		const highlightedName = highlightMatches( product.name, query );
		const categoryName = getCategoryName( product.category );
		const highlightedCategory = highlightMatches( categoryName, query );

		// Формируем HTML карточки
		item.innerHTML = `
            <div class="result-item-image">
                <img src="${getSafeImageUrl( product.image )}" 
                    alt="${escapeHtml( product.name )}"
                    loading="lazy"
                    onerror="this.onerror=null; this.src='${getFallbackImage()}'">
            </div>
            <div class="result-item-info">
                <div class="result-item-category">${highlightedCategory}</div>
                <div class="result-item-title">${highlightedName}</div>
                ${product.sku ? `<div class="result-item-sku">Артикул: ${escapeHtml( product.sku )}</div>` : ''}
                <div class="result-item-price">
                    <span class="current-price">${formattedPrice}</span>
                    ${oldPrice ? `<span class="old-price">${oldPrice}</span>` : ''}
                </div>
                <div class="result-item-status ${product.status === 'in-stock' ? 'in-stock' : 'out-of-stock'}">
                    <i class="fas ${product.status === 'in-stock' ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                    ${product.status === 'in-stock' ? 'В наличии' : 'Нет в наличии'}
                    ${product.quantity && product.status === 'in-stock' ? ` (${product.quantity} шт.)` : ''}
                </div>
            </div>
            <div class="result-item-actions">
                <button class="result-view-btn" data-url="${productUrl}">
                    <i class="fas fa-eye"></i> Просмотр
                </button>
                <button class="result-cart-btn ${product.status !== 'in-stock' ? 'disabled' : ''}" 
                        data-id="${product.id}"
                        ${product.status !== 'in-stock' ? 'disabled' : ''}>
                    <i class="fas fa-shopping-cart"></i> В корзину
                </button>
            </div>
        `;

		// Вешаем обработчик на кнопку "Просмотр"
		const viewBtn = item.querySelector( '.result-view-btn' );
		if ( viewBtn ) {
			viewBtn.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				const url = viewBtn.dataset.url;
				if ( url ) {
					window.location.href = url;
				}
			} );
		}

		// Вешаем обработчик на кнопку "В корзину"
		const cartBtn = item.querySelector( '.result-cart-btn' );
		if ( cartBtn && !cartBtn.disabled ) {
			cartBtn.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				const productId = cartBtn.dataset.id;
				addToCartFromSearch( productId );
			} );
		}

		return item;
	}

	// ============================================
	// 7. ДОБАВЛЕНИЕ ТОВАРА В КОРЗИНУ ИЗ РЕЗУЛЬТАТОВ ПОИСКА
	// ============================================

	/**
	 * Добавляет товар в корзину прямо из результатов поиска
	 * Выполняет проверки наличия товара и показывает уведомления
	 * 
	 * @param {string} productId - ID товара для добавления
	 */
	function addToCartFromSearch( productId ) {
		console.log( 'Добавление товара в корзину, ID:', productId );

		// Проверяем доступность хранилища
		if ( !window.store ) {
			console.error( 'Store не инициализирован' );
			showNotification( 'Ошибка: корзина не доступна', 'error' );
			return;
		}

		// Получаем товар по ID
		const product = window.store.getProduct( productId );

		console.log( 'Найденный товар:', product );

		// Проверяем, что товар существует
		if ( !product ) {
			console.error( 'Товар не найден, ID:', productId );
			showNotification( 'Товар не найден', 'error' );
			return;
		}

		// Проверяем наличие товара на складе
		if ( product.status !== 'in-stock' || product.quantity <= 0 ) {
			showNotification( 'Товар отсутствует на складе', 'error' );
			return;
		}

		// Пытаемся добавить товар в корзину
		const result = window.store.addToCart( productId, 1 );

		console.log( 'Результат добавления в корзину:', result );

		// Показываем уведомление о результате операции
		if ( result ) {
			showNotification( 'Товар добавлен в корзину', 'success' );
			updateCartCounter(); // Обновляем счётчик товаров в иконке корзины
		} else {
			showNotification( 'Не удалось добавить товар в корзину', 'error' );
		}
	}

	/**
	 * Обновляет счётчик товаров на иконке корзины в хедере
	 * Если корзина пуста — скрывает счётчик
	 */
	function updateCartCounter() {
		if ( window.store && window.store.getCartCount ) {
			const cartCount = window.store.getCartCount();
			const cartCountElement = document.getElementById( 'cartCount' );

			if ( cartCountElement ) {
				cartCountElement.textContent = cartCount;

				// Показываем или скрываем счётчик в зависимости от количества товаров
				if ( cartCount > 0 ) {
					cartCountElement.style.display = 'flex';
				} else {
					cartCountElement.style.display = 'none';
				}
			}
		}
	}

	// ============================================
	// 8. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
	// ============================================

	/**
	 * Форматирует цену в читаемый вид с разделителями разрядов
	 * Пример: 1500000 -> "1 500 000 ₽"
	 * 
	 * @param {number} price - Цена товара
	 * @returns {string} - Отформатированная цена со знаком рубля
	 */
	function formatPrice( price ) {
		if ( price === undefined || price === null ) return '0 ₽';
		return new Intl.NumberFormat( 'ru-RU' ).format( price ) + ' ₽';
	}

	/**
	 * Проверяет и возвращает безопасный URL изображения
	 * Если URL некорректный или отсутствует — возвращает заглушку
	 * 
	 * @param {string} url - URL изображения товара
	 * @returns {string} - Безопасный URL изображения или URL заглушки
	 */
	function getSafeImageUrl( url ) {
		if ( !url ) return getFallbackImage();

		// Проверяем что URL начинается с http, / или data:
		if ( url.startsWith( 'http' ) || url.startsWith( '/' ) || url.startsWith( 'data:' ) ) {
			return url;
		}

		// Если URL не соответствует ожидаемым форматам — возвращаем заглушку
		return getFallbackImage();
	}

	/**
	 * Возвращает URL изображения-заглушки для товаров без картинки
	 * @returns {string} - URL плейсхолдера
	 */
	function getFallbackImage() {
		return 'https://via.placeholder.com/100x100?text=Нет+изображения';
	}

	/**
	 * Возвращает URL страницы конкретного товара в зависимости от его категории
	 * Каждая категория имеет свою страницу в каталоге
	 * 
	 * @param {Object} product - Объект товара
	 * @returns {string} - URL страницы товара с query-параметром product
	 */
	function getProductUrl( product ) {
		// Маппинг кодов категорий на URL соответствующих страниц
		const categoryUrls = {
			'figures': '/pages html/catalog pages/figurines.html',
			'tea': '/pages html/catalog pages/tea.html',
			'sweets': '/pages html/catalog pages/sweets.html',
			'manga': '/pages html/catalog pages/manga.html',
			'clothing': '/pages html/catalog pages/clothes.html',
			'tableware': '/pages html/catalog pages/dishes.html',
			'games': '/pages html/catalog pages/games.html',
			'stationery': '/pages html/catalog pages/office.html',
			'cosmetics': '/pages html/catalog pages/cosmetics.html',
			'decor': '/pages html/catalog pages/decor.html',
			'anime': '/pages html/catalog pages/disks.html',
			'music': '/pages html/catalog pages/music.html',
			'other': '/pages html/catalog.html'
		};

		// Получаем базовый URL для категории или используем общий каталог
		const baseUrl = categoryUrls[product.category] || '/pages html/catalog.html';

		// Добавляем ID товара как query-параметр для прямой ссылки на товар
		return `${baseUrl}?product=${product.id}`;
	}

	/**
	 * Подсвечивает все вхождения поискового запроса в тексте
	 * 
	 * Функция подсвечивает КАЖДОЕ слово из запроса в тексте.
	 * Например, для запроса "чай матча" и текста "Матча-латте из японского чая"
	 * будут подсвечены оба слова: "матча" и "чай" (без учёта регистра).
	 * 
	 * @param {string} text - Исходный текст
	 * @param {string} query - Поисковый запрос
	 * @returns {string} - HTML-строка с подсвеченными совпадениями в тегах <mark>
	 */
	function highlightMatches( text, query ) {
		if ( !text || !query ) return escapeHtml( text );

		// Экранируем HTML-теги в исходном тексте чтобы избежать XSS
		let result = escapeHtml( text );

		// Разбиваем запрос на отдельные слова для независимой подсветки
		const words = query.toLowerCase().trim().split( /\s+/ );

		// Для каждого слова из запроса ищем и подсвечиваем все его вхождения
		words.forEach( word => {
			if ( word.length > 0 ) {
				// Экранируем спецсимволы регулярных выражений в слове
				// Это нужно чтобы корректно обрабатывать запросы содержащие скобки, точки и т.д.
				const escapedWord = word.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );

				// Создаём регулярное выражение для поиска слова
				// Флаги: g - глобальный поиск (все вхождения), i - игнорировать регистр
				const regex = new RegExp( `(${escapedWord})`, 'gi' );

				// Заменяем все найденные вхождения на обёрнутые в тег <mark>
				result = result.replace( regex, '<mark>$1</mark>' );
			}
		} );

		return result;
	}

	/**
	 * Экранирует HTML-символы в строке для безопасного отображения
	 * Предотвращает XSS-атаки при вставке пользовательских данных в DOM
	 * 
	 * @param {string} str - Исходная строка
	 * @returns {string} - Безопасная строка с экранированными HTML-символами
	 */
	function escapeHtml( str ) {
		if ( !str ) return '';
		return str
			.replace( /&/g, '&amp;' )   // Амперсанд должен экранироваться первым!
			.replace( /</g, '&lt;' )    // Знак "меньше"
			.replace( />/g, '&gt;' )    // Знак "больше"
			.replace( /"/g, '&quot;' )  // Двойные кавычки
			.replace( /'/g, '&#39;' );  // Одинарные кавычки
	}

	/**
	 * Показывает сообщение об отсутствии результатов поиска
	 * 
	 * @param {string} query - Поисковый запрос, по которому ничего не найдено
	 */
	function showNoResults( query ) {
		const searchResults = document.getElementById( 'searchResults' );
		const noResultsMsg = document.getElementById( 'noResultsMessage' );
		const resultsCount = document.getElementById( 'resultsCount' );

		// Очищаем контейнер с результатами
		if ( searchResults ) {
			searchResults.innerHTML = '';
			searchResults.classList.remove( 'has-results' );
		}

		// Показываем сообщение об отсутствии результатов
		if ( noResultsMsg ) {
			noResultsMsg.style.display = 'block';
			const querySpan = noResultsMsg.querySelector( '.search-query' );
			if ( querySpan ) {
				querySpan.textContent = query;
			}
		}

		// Скрываем счётчик результатов
		if ( resultsCount ) {
			resultsCount.style.display = 'none';
		}
	}

	// ============================================
	// 9. СИСТЕМА УВЕДОМЛЕНИЙ
	// ============================================

	/**
	 * Показывает всплывающее уведомление в правом нижнем углу экрана
	 * Автоматически исчезает через 3 секунды
	 * Можно закрыть кликом
	 * 
	 * @param {string} message - Текст уведомления
	 * @param {string} type - Тип уведомления: 'success', 'error', 'info'
	 */
	function showNotification( message, type = 'info' ) {
		// Пытаемся использовать метод из API если он доступен
		if ( window.API && window.API.showNotification ) {
			window.API.showNotification( message, type );
			return;
		}

		// Создаём элемент уведомления
		const notification = document.createElement( 'div' );
		notification.className = `notification notification-${type}`;

		// Выбираем иконку в зависимости от типа уведомления
		const icon = type === 'success' ? 'fa-check-circle' :
			type === 'error' ? 'fa-exclamation-circle' :
				'fa-info-circle';

		// Заполняем содержимое уведомления
		notification.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${escapeHtml( message )}</span>
        `;

		// Стилизуем уведомление
		notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#ff3366'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10001;
            animation: slideIn 0.3s ease;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;

		// Добавляем уведомление в DOM
		document.body.appendChild( notification );

		// Автоматически удаляем через 3 секунды
		setTimeout( () => {
			notification.style.animation = 'slideOut 0.3s ease';
			setTimeout( () => notification.remove(), 300 );
		}, 3000 );

		// Закрытие по клику
		notification.addEventListener( 'click', () => notification.remove() );
	}

	// ============================================
	// 10. СОЗДАНИЕ МОДАЛЬНОГО ОКНА ПОИСКА
	// ============================================

	/**
	 * Создаёт HTML-структуру модального окна поиска и добавляет в DOM
	 * Выполняется один раз при загрузке страницы
	 * Включает:
	 * - Поле ввода с кнопкой поиска
	 * - Область результатов
	 * - Сообщение об отсутствии результатов
	 * - Блок с популярными поисковыми запросами (быстрые подсказки)
	 */
	function createSearchModal() {
		// Если окно уже существует — не создаём повторно
		if ( document.getElementById( 'searchModal' ) ) return;

		// HTML-структура модального окна
		const modalHTML = `
            <div id="searchModal" class="modal search-modal">
                <div class="modal-content search-modal-content">
                    
                    <!-- Заголовок с кнопкой закрытия -->
                    <div class="search-header">
                        <h2><i class="fas fa-search"></i> Поиск по сайту</h2>
                        <button class="close-search">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <!-- Форма поиска -->
                    <form id="searchForm" class="search-form">
                        <div class="search-input-wrapper">
                            <i class="fas fa-search search-icon"></i>
                            <input type="text" id="searchInput" 
                                   placeholder="Введите название товара, категорию, артикул..." 
                                   autocomplete="off">
                            <button type="submit" class="search-submit-btn">
                                <i class="fas fa-search"></i> Найти
                            </button>
                        </div>
                    </form>
                    
                    <!-- Контейнер для результатов поиска -->
                    <div class="search-results-container">
                        <!-- Счётчик найденных товаров -->
                        <div id="resultsCount" class="results-header" style="display: none;"></div>
                        
                        <!-- Список результатов -->
                        <div id="searchResults" class="search-results-list"></div>
                        
                        <!-- Сообщение если ничего не найдено -->
                        <div id="noResultsMessage" class="no-results-message" style="display: none;">
                            <i class="fas fa-search"></i>
                            <p>По запросу "<span class="search-query"></span>" ничего не найдено</p>
                            <p class="suggestion-text">
                                Попробуйте изменить поисковый запрос или перейти в 
                                <a href="/pages html/catalog.html">каталог</a>
                            </p>
                        </div>
                    </div>
                    
                    <!-- Популярные поисковые запросы (быстрые подсказки) -->
                    <div class="search-suggestions">
                        <p class="suggestions-title">Популярные запросы:</p>
                        <div class="suggestions-tags">
                            <span class="suggestion-tag" data-query="Аниме фигурки">Аниме фигурки</span>
                            <span class="suggestion-tag" data-query="Японский чай">Японский чай</span>
                            <span class="suggestion-tag" data-query="Манга">Манга</span>
                            <span class="suggestion-tag" data-query="Канцелярия">Канцелярия</span>
                            <span class="suggestion-tag" data-query="Косметика">Косметика</span>
                            <span class="suggestion-tag" data-query="Фигурка Наруто">Фигурка Наруто</span>
                            <span class="suggestion-tag" data-query="Маття">Маття</span>
                            <span class="suggestion-tag" data-query="Мочи">Мочи</span>
                        </div>
                    </div>
                    
                </div>
            </div>
        `;

		// Добавляем модальное окно в конец body
		document.body.insertAdjacentHTML( 'beforeend', modalHTML );

		// Добавляем стили для анимаций уведомлений
		addNotificationStyles();

		// Вешаем обработчики на теги популярных запросов
		document.querySelectorAll( '.suggestion-tag' ).forEach( tag => {
			tag.addEventListener( 'click', function () {
				const query = this.dataset.query || this.textContent;
				const searchInput = document.getElementById( 'searchInput' );
				if ( searchInput ) {
					searchInput.value = query;
					performSearch( query );
				}
			} );
		} );
	}

	/**
	 * Добавляет CSS-стили для анимаций уведомлений
	 * Выполняется один раз при создании модального окна
	 */
	function addNotificationStyles() {
		// Проверяем что стили ещё не добавлены чтобы избежать дублирования
		if ( document.getElementById( 'notification-styles' ) ) return;

		// CSS-анимации для появления и исчезновения уведомлений
		const styles = `
            <style id="notification-styles">
                /* Анимация появления уведомления (выезд справа) */
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
                
                /* Анимация исчезновения уведомления (уезд вправо) */
                @keyframes slideOut {
                    from {
                        opacity: 1;
                        transform: translateX(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(100px);
                    }
                }
            </style>
        `;

		// Добавляем стили в <head>
		document.head.insertAdjacentHTML( 'beforeend', styles );
	}
} );