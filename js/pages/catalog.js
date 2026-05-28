/**
 * ============================================================================
 * CATALOG-GRID.JS - МОДУЛЬ СЕТКИ КАТАЛОГА КАТЕГОРИЙ (ИСПРАВЛЕННАЯ ВЕРСИЯ)
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * - Управляет разворачиванием/сворачиванием скрытых категорий в каталоге
 * - Анимирует появление/скрытие дополнительных категорий
 * - Работает с сеткой категорий (.catalog-grid), а не с товарами
 * - НЕ управляет кнопками товаров (это делает ButtonManager)
 * 
 * СТРУКТУРА HTML, КОТОРУЮ ОЖИДАЕТ МОДУЛЬ:
 * <section class="catalog-preview">
 *   <h2>Все категории</h2>
 *   <div class="catalog-grid">
 *     <div class="catalog-item">...</div>              <!-- Видимая категория -->
 *     <div class="catalog-item hidden-category">...</div> <!-- Скрытая категория -->
 *     <div class="catalog-item hidden-category">...</div> <!-- Скрытая категория -->
 *   </div>
 *   <div class="accordion-footer">
 *     <button class="show-all-btn">
 *       <span>Показать все товары</span>
 *       <i class="fas fa-arrow-right"></i>
 *     </button>
 *   </div>
 * </section>
 * 
 * ЗАВИСИМОСТИ:
 * - НЕ зависит от ButtonManager или других модулей
 * - Может работать независимо на любой странице с каталогом категорий
 * - Не требует store или API
 * 
 * ============================================================================
 */

class CatalogGrid {
	constructor() {
		// Проверяем, есть ли на странице каталог категорий
		this.isCatalogPage = !!document.querySelector( '.catalog-grid' );

		// Если нет сетки каталога - прекращаем инициализацию
		if ( !this.isCatalogPage ) {
			console.log( '📚 CatalogGrid: сетка каталога (.catalog-grid) не найдена. Модуль неактивен.' );
			return;
		}

		/** @type {boolean} Флаг успешной инициализации */
		this.isInitialized = false;

		/** @type {boolean} Флаг состояния развертывания категорий */
		this._isExpanded = false;

		/** @type {Object} Кэш DOM-элементов для оптимизации производительности */
		this._cache = {
			catalogGrid: null,         // Контейнер с категориями (.catalog-grid)
			showAllBtn: null,          // Кнопка "Показать все" (.show-all-btn)
			hiddenCategories: [],      // Скрытые категории (.catalog-item.hidden-category)
			accordionFooter: null      // Футер с кнопкой (.accordion-footer)
		};

		/** @type {Function|null} Обработчик клика по кнопке развертывания */
		this._clickHandler = null;

		/** @type {MutationObserver|null} Наблюдатель за изменениями DOM */
		this._observer = null;

		/** @type {Function|null} Обработчик ресайза (для адаптивности) */
		this._resizeHandler = null;

		// Запускаем инициализацию
		this.init();
	}

	// =========================================================================
	// ИНИЦИАЛИЗАЦИЯ
	// =========================================================================

	/**
	 * Основной метод инициализации модуля
	 * Кэширует DOM-элементы и настраивает все обработчики
	 */
	init() {
		try {
			console.log( '📚 CatalogGrid: начало инициализации...' );

			// Кэшируем все необходимые DOM-элементы
			this._cacheDomElements();

			// Проверяем, что все ключевые элементы найдены
			if ( !this._validateRequiredElements() ) {
				console.error( '📚 CatalogGrid: не все обязательные элементы найдены. Инициализация прервана.' );
				return;
			}

			// Настраиваем механизм разворачивания/сворачивания
			this.setupExpandableCatalog();

			// Запускаем наблюдатель за изменениями DOM
			this._observeDOMMutations();

			// Добавляем обработчик ресайза для адаптивности
			this._setupResizeHandler();

			// Отмечаем успешную инициализацию
			this.isInitialized = true;
			console.log( '✅ CatalogGrid: инициализация успешно завершена' );
		} catch ( error ) {
			console.error( '📚 CatalogGrid: критическая ошибка при инициализации:', error );
		}
	}

	// =========================================================================
	// КЭШИРОВАНИЕ DOM-ЭЛЕМЕНТОВ
	// =========================================================================

	/**
	 * Находит и сохраняет ссылки на все необходимые DOM-элементы
	 * Вызывается при инициализации и при обновлении
	 * @private
	 */
	_cacheDomElements() {
		// Основной контейнер с сеткой категорий
		this._cache.catalogGrid = document.querySelector( '.catalog-grid' );

		// Кнопка "Показать все товары" / "Скрыть товары"
		this._cache.showAllBtn = document.querySelector( '.show-all-btn' );

		// Все скрытые категории (имеют класс hidden-category внутри catalog-grid)
		this._cache.hiddenCategories = document.querySelectorAll( '.catalog-grid .catalog-item.hidden-category' );

		// Футер с кнопкой (родительский контейнер кнопки)
		this._cache.accordionFooter = document.querySelector( '.accordion-footer' );

		// Логируем результаты поиска для отладки
		console.log( '📚 CatalogGrid: результаты кэширования DOM-элементов:', {
			catalogGrid: !!this._cache.catalogGrid,
			showAllBtn: !!this._cache.showAllBtn,
			hiddenCategoriesCount: this._cache.hiddenCategories.length,
			accordionFooter: !!this._cache.accordionFooter,
			buttonText: this._cache.showAllBtn?.textContent?.trim() || 'не найдена'
		} );
	}

	/**
	 * Проверяет наличие всех обязательных элементов
	 * @returns {boolean} true если все элементы найдены
	 * @private
	 */
	_validateRequiredElements() {
		const missing = [];

		if ( !this._cache.catalogGrid ) {
			missing.push( '.catalog-grid' );
		}
		if ( !this._cache.showAllBtn ) {
			missing.push( '.show-all-btn' );
		}

		if ( missing.length > 0 ) {
			console.warn( '📚 CatalogGrid: не найдены обязательные элементы:', missing.join( ', ' ) );
			return false;
		}

		return true;
	}

	// =========================================================================
	// НАБЛЮДАТЕЛЬ ЗА DOM
	// =========================================================================

	/**
	 * Следит за изменениями в DOM для автоматической перенастройки
	 * Важно при динамическом добавлении/удалении категорий через JavaScript
	 * @private
	 */
	_observeDOMMutations() {
		// Наблюдаем за всей секцией каталога
		const catalogSection = document.querySelector( '.catalog-preview' );
		if ( !catalogSection ) {
			console.warn( '📚 CatalogGrid: секция .catalog-preview не найдена для наблюдения' );
			return;
		}

		// Отключаем предыдущий наблюдатель если был
		if ( this._observer ) {
			this._observer.disconnect();
		}

		// Создаем новый наблюдатель
		this._observer = new MutationObserver( ( mutations ) => {
			let needsUpdate = false;

			// Проверяем все мутации
			for ( const mutation of mutations ) {
				if ( mutation.type === 'childList' ) {
					// Проверяем добавленные узлы
					for ( const node of mutation.addedNodes ) {
						if ( node.nodeType === 1 ) {
							// Проверяем, является ли узел скрытой категорией или содержит её
							if ( node.classList?.contains( 'hidden-category' ) ||
								node.querySelector?.( '.hidden-category' ) ) {
								needsUpdate = true;
								break;
							}
							// Проверяем, не добавилась ли новая кнопка
							if ( node.classList?.contains( 'show-all-btn' ) ||
								node.querySelector?.( '.show-all-btn' ) ) {
								needsUpdate = true;
								break;
							}
						}
					}

					// Проверяем удаленные узлы
					for ( const node of mutation.removedNodes ) {
						if ( node.nodeType === 1 ) {
							if ( node.classList?.contains( 'hidden-category' ) ||
								node.classList?.contains( 'show-all-btn' ) ||
								node.querySelector?.( '.hidden-category' ) ||
								node.querySelector?.( '.show-all-btn' ) ) {
								needsUpdate = true;
								break;
							}
						}
					}
				}

				// Проверяем изменения атрибутов (классов) у скрытых категорий
				if ( mutation.type === 'attributes' &&
					mutation.attributeName === 'class' &&
					mutation.target.classList?.contains( 'hidden-category' ) ) {
					needsUpdate = true;
					break;
				}

				if ( needsUpdate ) break;
			}

			// Если нужны обновления - перенастраиваем
			if ( needsUpdate ) {
				console.log( '📚 CatalogGrid: обнаружены изменения в DOM, перенастраиваю...' );
				// Небольшая задержка для гарантии завершения рендеринга
				setTimeout( () => {
					this._cacheDomElements();
					this.setupExpandableCatalog();
				}, 50 );
			}
		} );

		// Запускаем наблюдение
		this._observer.observe( catalogSection, {
			childList: true,    // Добавление/удаление элементов
			subtree: true,      // Включая все дочерние элементы
			attributes: true,   // Изменение атрибутов
			attributeFilter: ['class'] // Только изменения класса
		} );

		console.log( '📚 CatalogGrid: наблюдатель DOM запущен' );
	}

	/**
	 * Настраивает обработчик изменения размера окна
	 * Нужен для корректного отображения на разных разрешениях
	 * @private
	 */
	_setupResizeHandler() {
		this._resizeHandler = () => {
			// При ресайзе обновляем кэш и перенастраиваем
			this._cacheDomElements();
			// Если категории были развернуты - восстанавливаем состояние
			if ( this._isExpanded ) {
				this._restoreExpandedState();
			}
		};

		window.addEventListener( 'resize', this._resizeHandler );
		console.log( '📚 CatalogGrid: обработчик ресайза настроен' );
	}

	// =========================================================================
	// НАСТРОЙКА РАЗВОРАЧИВАНИЯ КАТАЛОГА
	// =========================================================================

	/**
	 * Основной метод настройки разворачивания/сворачивания категорий
	 * 
	 * Может вызываться многократно - безопасно удаляет старые обработчики.
	 * Автоматически скрывает кнопку если нет скрытых категорий.
	 * Восстанавливает состояние если категории были развернуты.
	 */
	setupExpandableCatalog() {
		try {
			// Получаем актуальные ссылки на элементы
			const catalogGrid = this._cache.catalogGrid;
			const showAllBtn = this._cache.showAllBtn;
			const hiddenCategories = this._cache.hiddenCategories;

			// Проверяем наличие обязательных элементов
			if ( !showAllBtn ) {
				console.warn( '📚 CatalogGrid: кнопка .show-all-btn не найдена!' );
				return;
			}

			if ( !catalogGrid ) {
				console.warn( '📚 CatalogGrid: контейнер .catalog-grid не найден!' );
				return;
			}

			// Если нет скрытых категорий - скрываем кнопку и выходим
			if ( hiddenCategories.length === 0 ) {
				console.log( '📚 CatalogGrid: нет скрытых категорий, кнопка скрыта' );
				this._hideButton( showAllBtn );
				return;
			}

			// Показываем кнопку (на случай если была скрыта ранее)
			this._showButton( showAllBtn );

			// Удаляем старый обработчик клика если он был
			if ( this._clickHandler ) {
				showAllBtn.removeEventListener( 'click', this._clickHandler );
				console.log( '📚 CatalogGrid: старый обработчик клика удален' );
			}

			// Инициализируем скрытые категории (устанавливаем начальное состояние)
			this._initializeHiddenCategories( hiddenCategories );

			// Создаем новый обработчик клика
			this._clickHandler = ( e ) => {
				// Предотвращаем стандартное поведение и всплытие
				e.preventDefault();
				e.stopPropagation();

				console.log( '📚 CatalogGrid: клик по кнопке, текущее состояние:',
					this._isExpanded ? 'развернуто' : 'свернуто' );

				// Переключаем состояние
				if ( this._isExpanded ) {
					this._collapseCategories();
				} else {
					this._expandCategories();
				}

				// Инвертируем флаг состояния
				this._isExpanded = !this._isExpanded;
			};

			// Прикрепляем новый обработчик
			showAllBtn.addEventListener( 'click', this._clickHandler );
			console.log( '📚 CatalogGrid: обработчик клика прикреплен' );

			// Если категории были развернуты до этого - восстанавливаем состояние
			if ( this._isExpanded ) {
				this._restoreExpandedState();
			}

			console.log( '📚 CatalogGrid: механизм разворачивания настроен (скрытых категорий:', hiddenCategories.length + ')' );
		} catch ( error ) {
			console.error( '📚 CatalogGrid: ошибка при настройке разворачивания:', error );
		}
	}

	/**
	 * Скрывает кнопку и её контейнер
	 * @param {HTMLElement} btn - кнопка
	 * @private
	 */
	_hideButton( btn ) {
		btn.style.display = 'none';
		const footer = btn.closest( '.accordion-footer' );
		if ( footer ) {
			footer.style.display = 'none';
		}
	}

	/**
	 * Показывает кнопку и её контейнер
	 * @param {HTMLElement} btn - кнопка
	 * @private
	 */
	_showButton( btn ) {
		btn.style.display = '';
		const footer = btn.closest( '.accordion-footer' );
		if ( footer ) {
			footer.style.display = '';
		}
	}

	/**
	 * Инициализирует скрытые категории (начальные стили для анимации)
	 * @param {NodeList} hiddenCategories - список скрытых категорий
	 * @private
	 */
	_initializeHiddenCategories( hiddenCategories ) {
		hiddenCategories.forEach( ( item ) => {
			// Устанавливаем базовые стили для анимации
			item.style.transition = 'all 0.5s ease';

			// Если категории свернуты - применяем стили скрытия
			if ( !this._isExpanded ) {
				item.style.opacity = '0';
				item.style.transform = 'translateY(20px)';
				item.style.maxHeight = '0';
				item.style.marginTop = '0';
				item.style.marginBottom = '0';
				item.style.paddingTop = '0';
				item.style.paddingBottom = '0';
				item.style.overflow = 'hidden';

				// Полностью скрываем через display после установки стилей
				// (небольшая задержка чтобы стили применились)
				setTimeout( () => {
					if ( !this._isExpanded ) {
						item.style.display = 'none';
					}
				}, 50 );
			}
		} );
	}

	/**
	 * Восстанавливает развернутое состояние категорий
	 * Используется при повторной инициализации после изменений DOM
	 * @private
	 */
	_restoreExpandedState() {
		const { catalogGrid, showAllBtn, hiddenCategories } = this._cache;

		if ( !catalogGrid || !showAllBtn ) {
			console.warn( '📚 CatalogGrid: не могу восстановить состояние - элементы не найдены' );
			return;
		}

		console.log( '📚 CatalogGrid: восстановление развернутого состояния' );

		// Добавляем классы развернутого состояния
		catalogGrid.classList.add( 'expanded' );
		showAllBtn.classList.add( 'expanded' );

		// Показываем все скрытые категории
		if ( hiddenCategories.length > 0 ) {
			hiddenCategories.forEach( item => {
				// Убираем все стили скрытия
				item.style.display = '';
				item.style.opacity = '1';
				item.style.transform = 'translateY(0)';
				item.style.maxHeight = '500px'; // Достаточно большое значение
				item.style.marginTop = '';
				item.style.marginBottom = '';
				item.style.paddingTop = '';
				item.style.paddingBottom = '';
				item.style.overflow = '';
			} );
		}

		// Обновляем текст и иконку кнопки
		this._updateButtonText( showAllBtn, 'Скрыть товары', 'fas fa-arrow-up' );

		console.log( '📚 CatalogGrid: развернутое состояние восстановлено' );
	}

	// =========================================================================
	// АНИМАЦИЯ РАЗВОРАЧИВАНИЯ/СВОРАЧИВАНИЯ
	// =========================================================================

	/**
	 * Разворачивает скрытые категории с плавной каскадной анимацией
	 * @private
	 */
	_expandCategories() {
		const { catalogGrid, showAllBtn, hiddenCategories } = this._cache;

		if ( !catalogGrid || !showAllBtn || hiddenCategories.length === 0 ) {
			console.warn( '📚 CatalogGrid: не все элементы доступны для разворачивания' );
			return;
		}

		console.log( `📚 CatalogGrid: разворачиваю ${hiddenCategories.length} категорий...` );

		// Добавляем классы развернутого состояния
		catalogGrid.classList.add( 'expanded' );
		showAllBtn.classList.add( 'expanded' );

		// Анимируем появление каждой категории с каскадной задержкой
		hiddenCategories.forEach( ( item, index ) => {
			// Задержка для каскадного эффекта
			setTimeout( () => {
				// Сначала показываем элемент
				item.style.display = '';

				// Даем браузеру время обработать display
				// requestAnimationFrame гарантирует что стили применятся до анимации
				requestAnimationFrame( () => {
					// Запускаем анимацию появления
					item.style.opacity = '1';
					item.style.transform = 'translateY(0)';
					item.style.maxHeight = '500px'; // Достаточно для любого контента
					item.style.marginTop = '';
					item.style.marginBottom = '';
					item.style.paddingTop = '';
					item.style.paddingBottom = '';
					item.style.overflow = '';
				} );
			}, index * 100 ); // Каждая следующая категория появляется с задержкой 100мс
		} );

		// Обновляем текст и иконку кнопки
		this._updateButtonText( showAllBtn, 'Скрыть товары', 'fas fa-arrow-up' );

		console.log( '📚 CatalogGrid: категории развернуты' );
	}

	/**
	 * Сворачивает скрытые категории с плавной анимацией
	 * @private
	 */
	_collapseCategories() {
		const { catalogGrid, showAllBtn, hiddenCategories } = this._cache;

		if ( !catalogGrid || !showAllBtn || hiddenCategories.length === 0 ) {
			console.warn( '📚 CatalogGrid: не все элементы доступны для сворачивания' );
			return;
		}

		console.log( `📚 CatalogGrid: сворачиваю ${hiddenCategories.length} категорий...` );

		// Анимируем скрытие категорий
		// Используем обратный порядок для визуального эффекта
		const reversedCategories = [...hiddenCategories].reverse();

		reversedCategories.forEach( ( item, index ) => {
			setTimeout( () => {
				// Запускаем анимацию скрытия
				item.style.opacity = '0';
				item.style.transform = 'translateY(20px)';
				item.style.maxHeight = '0';
				item.style.marginTop = '0';
				item.style.marginBottom = '0';
				item.style.paddingTop = '0';
				item.style.paddingBottom = '0';
				item.style.overflow = 'hidden';

				// Полностью скрываем после завершения анимации
				setTimeout( () => {
					// Проверяем, не передумал ли пользователь
					// (мог нажать "развернуть" пока анимация еще идет)
					if ( !this._isExpanded ) {
						item.style.display = 'none';
					}
				}, 500 ); // Время должно совпадать с длительностью CSS-анимации (0.5s)
			}, index * 100 ); // Обратный каскадный эффект
		} );

		// Убираем класс expanded после завершения всех анимаций
		const totalAnimationTime = hiddenCategories.length * 100 + 500;
		setTimeout( () => {
			if ( !this._isExpanded ) {
				catalogGrid.classList.remove( 'expanded' );
			}
		}, totalAnimationTime );

		showAllBtn.classList.remove( 'expanded' );

		// Обновляем текст и иконку кнопки
		this._updateButtonText( showAllBtn, 'Показать все товары', 'fas fa-arrow-right' );

		console.log( '📚 CatalogGrid: категории свернуты' );
	}

	// =========================================================================
	// ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
	// =========================================================================

	/**
	 * Обновляет текст и иконку на кнопке развертывания
	 * 
	 * @param {HTMLElement} btn - кнопка для обновления
	 * @param {string} text - новый текст кнопки
	 * @param {string} iconClass - классы иконки Font Awesome (например, 'fas fa-arrow-right')
	 * @private
	 */
	_updateButtonText( btn, text, iconClass ) {
		if ( !btn ) return;

		// Обновляем текст в span
		const span = btn.querySelector( 'span' );
		if ( span ) {
			span.textContent = text;
		}

		// Обновляем иконку, сохраняя размер (fa-lg, fa-sm и т.д.)
		const icon = btn.querySelector( 'i' );
		if ( icon ) {
			// Сохраняем классы размера если есть
			const sizeClasses = Array.from( icon.classList ).filter( cls =>
				cls.startsWith( 'fa-' ) && !['fa-arrow-right', 'fa-arrow-up', 'fa-arrow-down'].includes( cls )
			);

			// Устанавливаем новые классы
			icon.className = iconClass;

			// Восстанавливаем классы размера
			sizeClasses.forEach( cls => icon.classList.add( cls ) );
		}
	}

	// =========================================================================
	// ПУБЛИЧНОЕ API
	// =========================================================================

	/**
	 * Принудительно обновляет настройки каталога
	 * Полезно вызывать после динамических изменений DOM из других скриптов
	 * 
	 * Использование: window.catalogGrid.refresh()
	 */
	refresh() {
		console.log( '📚 CatalogGrid: принудительное обновление...' );

		// Обновляем кэш DOM-элементов
		this._cacheDomElements();

		// Перенастраиваем разворачивание
		this.setupExpandableCatalog();

		console.log( '✅ CatalogGrid: обновление завершено' );
	}

	/**
	 * Получает текущее состояние развертывания
	 * @returns {boolean} true если категории развернуты
	 */
	isExpanded() {
		return this._isExpanded;
	}

	/**
	 * Программно разворачивает категории
	 * Можно использовать из консоли или других модулей
	 */
	expand() {
		if ( !this._isExpanded ) {
			console.log( '📚 CatalogGrid: программное разворачивание' );
			this._expandCategories();
			this._isExpanded = true;
		}
	}

	/**
	 * Программно сворачивает категории
	 * Можно использовать из консоли или других модулей
	 */
	collapse() {
		if ( this._isExpanded ) {
			console.log( '📚 CatalogGrid: программное сворачивание' );
			this._collapseCategories();
			this._isExpanded = false;
		}
	}

	/**
	 * Переключает состояние развертывания
	 * Удобно для привязки к кастомным событиям
	 */
	toggle() {
		console.log( '📚 CatalogGrid: программное переключение' );
		if ( this._isExpanded ) {
			this.collapse();
		} else {
			this.expand();
		}
	}

	/**
	 * Получает количество скрытых категорий
	 * @returns {number} Количество скрытых категорий
	 */
	getHiddenCount() {
		return this._cache.hiddenCategories.length;
	}

	/**
	 * Получает общее количество категорий (видимых + скрытых)
	 * @returns {number} Общее количество категорий
	 */
	getTotalCount() {
		if ( !this._cache.catalogGrid ) return 0;
		return this._cache.catalogGrid.querySelectorAll( '.catalog-item' ).length;
	}

	// =========================================================================
	// ОЧИСТКА РЕСУРСОВ
	// =========================================================================

	/**
	 * Полностью очищает все ресурсы модуля
	 * Вызывать при удалении модуля или переходе на другую страницу в SPA
	 * 
	 * Использование: window.catalogGrid.destroy()
	 */
	destroy() {
		console.log( '📚 CatalogGrid: очистка ресурсов...' );

		// Удаляем обработчик клика с кнопки
		if ( this._cache.showAllBtn && this._clickHandler ) {
			this._cache.showAllBtn.removeEventListener( 'click', this._clickHandler );
			this._clickHandler = null;
			console.log( '📚 CatalogGrid: обработчик клика удален' );
		}

		// Отключаем наблюдатель DOM
		if ( this._observer ) {
			this._observer.disconnect();
			this._observer = null;
			console.log( '📚 CatalogGrid: наблюдатель DOM отключен' );
		}

		// Удаляем обработчик ресайза
		if ( this._resizeHandler ) {
			window.removeEventListener( 'resize', this._resizeHandler );
			this._resizeHandler = null;
			console.log( '📚 CatalogGrid: обработчик ресайза удален' );
		}

		// Очищаем кэш
		this._cache = {
			catalogGrid: null,
			showAllBtn: null,
			hiddenCategories: [],
			accordionFooter: null
		};

		// Сбрасываем состояние
		this._isExpanded = false;
		this.isInitialized = false;

		console.log( '✅ CatalogGrid: ресурсы успешно очищены' );
	}
}

// =========================================================================
// ЗАПУСК МОДУЛЯ
// =========================================================================

/**
 * Инициализация модуля после полной загрузки DOM
 * Создает глобальный экземпляр для доступа из других модулей и консоли
 */
document.addEventListener( 'DOMContentLoaded', () => {
	try {
		// Создаем экземпляр только если он еще не существует
		if ( !window.catalogGrid ) {
			window.catalogGrid = new CatalogGrid();

			// Логируем результат
			if ( window.catalogGrid.isInitialized ) {
				console.log( '✅ CatalogGrid: модуль успешно запущен' );
				console.log( '💡 CatalogGrid: для управления из консоли используйте:' );
				console.log( '   window.catalogGrid.expand()        - развернуть категории' );
				console.log( '   window.catalogGrid.collapse()      - свернуть категории' );
				console.log( '   window.catalogGrid.toggle()        - переключить состояние' );
				console.log( '   window.catalogGrid.isExpanded()    - узнать состояние' );
				console.log( '   window.catalogGrid.getHiddenCount() - количество скрытых' );
				console.log( '   window.catalogGrid.getTotalCount()  - общее количество' );
				console.log( '   window.catalogGrid.refresh()       - принудительно обновить' );
				console.log( '   window.catalogGrid.destroy()       - уничтожить модуль' );
			}
		}
	} catch ( error ) {
		console.error( '📚 CatalogGrid: критическая ошибка при запуске модуля:', error );
	}
} );

// Экспорт для использования в модульных системах (ES6, CommonJS)
if ( typeof module !== 'undefined' && module.exports ) {
	module.exports = CatalogGrid;
}