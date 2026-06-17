/**
 * ============================================================================
 * ACCORDION-LOGO.JS — ПРОМО-СЛАЙДЫ ДЛЯ ГЛАВНОЙ СТРАНИЦЫ
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * Управляет горизонтальным аккордеоном с промо-слайдами на главной странице
 * и админ-панелью для управления этими слайдами.
 * 
 * ОСНОВНЫЕ ВОЗМОЖНОСТИ:
 * - Автоматическая прокрутка слайдов с паузой при наведении
 * - Ленивая загрузка фоновых изображений (первый слайд сразу, остальные — при приближении)
 * - Навигационные точки-индикаторы
 * - Админ-панель: CRUD слайдов, drag-and-drop сортировка, загрузка изображений
 * 
 * ЗАВИСИМОСТИ:
 * - store.js (глобальный window.store) — хранение слайдов в localStorage
 * - API.js (глобальный window.API) — утилиты (getSafeImageUrl, showNotification и др.)
 * 
 * АРХИТЕКТУРА:
 * - Один класс PromoSlidesManager
 * - Два режима: frontend (главная страница) и admin (админ-панель)
 * - Режим определяется по наличию элемента #promoSlidesList в DOM
 * 
 * ============================================================================
 */

class PromoSlidesManager {

	/**
	 * Создаёт экземпляр менеджера промо-слайдов.
	 * Определяет режим работы (админка или фронтенд) и запускает инициализацию.
	 */
	constructor() {
		// ID редактируемого слайда (null = создание нового)
		this.currentEditId = null;

		// Таймер автоматической прокрутки
		this.autoPlayInterval = null;

		// Флаг инициализации аккордеона (защита от двойного запуска)
		this.accordionInitialized = false;

		// Временный URL для превью загруженного изображения (через URL.createObjectURL)
		this.currentPreviewUrl = null;

		// Определяем режим: админка или фронтенд
		this.isAdmin = !!document.getElementById( 'promoSlidesList' );

		if ( this.isAdmin ) {
			this.initAdmin();
		} else {
			this.initFrontend();
		}
	}

	// =========================================================================
	// 1. АДМИН-ПАНЕЛЬ
	// =========================================================================

	/**
	 * Инициализирует режим администрирования.
	 * Рендерит список слайдов, привязывает события, подписывается на обновления.
	 */
	initAdmin() {
		console.log( '🖥️ Режим администрирования промо-слайдов' );
		this.renderSlidesList();
		this.bindAdminEvents();

		// Слушаем событие обновления слайдов (вызывается из store)
		window.addEventListener( 'promoslides:updated', () => {
			this.renderSlidesList();
		} );
	}

	/**
	 * Рендерит список слайдов в админ-панели.
	 * Активные слайды отображаются первыми.
	 */
	renderSlidesList() {
		const container = document.getElementById( 'promoSlidesList' );
		if ( !container ) return;

		const slides = store.getPromoSlides();
		const activeSlides = slides.filter( s => s.status === 'active' );
		const inactiveSlides = slides.filter( s => s.status === 'inactive' );
		const sortedSlides = [...activeSlides, ...inactiveSlides];

		if ( sortedSlides.length === 0 ) {
			container.innerHTML = '<div class="loading-slides">Нет слайдов. Нажмите "Добавить слайд"</div>';
			return;
		}

		container.innerHTML = sortedSlides.map( slide => this.renderSlideItem( slide ) ).join( '' );
		this.initDragAndDrop();
	}

	/**
	 * Рендерит HTML-строку одного элемента списка слайдов.
	 * 
	 * @param {Object} slide — объект слайда
	 * @returns {string} HTML-строка
	 */
	renderSlideItem( slide ) {
		const statusText = slide.status === 'active' ? 'Активен' : 'Неактивен';
		const statusClass = slide.status;

		return `
			<div class="slide-item" data-id="${slide.id}" data-order="${slide.order}">
				<div class="drag-handle">
					<i class="fas fa-grip-vertical"></i>
				</div>
				<div class="slide-preview">
					${slide.image
				? `<img src="${slide.image}" alt="${slide.title}" onerror="this.src='/image/no-image.jpg'">`
				: '<div class="slide-preview-placeholder"><i class="fas fa-image"></i></div>'
			}
				</div>
				<div class="slide-info">
					<div class="slide-title">${this.escapeHtml( slide.title )}</div>
					<div class="slide-description">${this.escapeHtml( slide.description )}</div>
					${slide.price ? `<div class="slide-price">${this.escapeHtml( slide.price )}</div>` : ''}
				</div>
				<div class="slide-order">
					<span class="slide-status-badge ${statusClass}">${statusText}</span>
				</div>
				<div class="slide-actions">
					<button class="slide-action-btn edit-slide" data-id="${slide.id}" title="Редактировать">
						<i class="fas fa-edit"></i>
					</button>
					<button class="slide-action-btn delete-slide" data-id="${slide.id}" title="Удалить">
						<i class="fas fa-trash"></i>
					</button>
				</div>
			</div>
		`;
	}

	/**
	 * Инициализирует drag-and-drop для сортировки слайдов.
	 * Меняет порядковые номера (order) перетаскиваемых слайдов.
	 */
	initDragAndDrop() {
		const items = document.querySelectorAll( '.slide-item' );
		let draggedItem = null;

		items.forEach( item => {
			item.setAttribute( 'draggable', 'true' );

			item.addEventListener( 'dragstart', ( e ) => {
				draggedItem = item;
				item.classList.add( 'dragging' );
				e.dataTransfer.effectAllowed = 'move';
			} );

			item.addEventListener( 'dragend', () => {
				item.classList.remove( 'dragging' );
				draggedItem = null;
			} );

			item.addEventListener( 'dragover', ( e ) => {
				e.preventDefault();
				e.dataTransfer.dropEffect = 'move';
			} );

			item.addEventListener( 'dragenter', ( e ) => {
				e.preventDefault();
				if ( item !== draggedItem ) item.classList.add( 'drag-over' );
			} );

			item.addEventListener( 'dragleave', () => {
				item.classList.remove( 'drag-over' );
			} );

			item.addEventListener( 'drop', ( e ) => {
				e.preventDefault();
				item.classList.remove( 'drag-over' );

				if ( draggedItem && draggedItem !== item ) {
					const draggedId = parseInt( draggedItem.dataset.id );
					const targetId = parseInt( item.dataset.id );

					const slides = store.getPromoSlides();
					const draggedSlide = slides.find( s => s.id === draggedId );
					const targetSlide = slides.find( s => s.id === targetId );

					if ( draggedSlide && targetSlide ) {
						const draggedOrder = draggedSlide.order;
						const targetOrder = targetSlide.order;

						draggedSlide.order = targetOrder;
						targetSlide.order = draggedOrder;

						store.updatePromoSlide( draggedId, { order: targetOrder } );
						store.updatePromoSlide( targetId, { order: draggedOrder } );

						this.renderSlidesList();
					}
				}
			} );
		} );
	}

	// =========================================================================
	// 2. МОДАЛЬНОЕ ОКНО (ДОБАВЛЕНИЕ / РЕДАКТИРОВАНИЕ СЛАЙДА)
	// =========================================================================

	/**
	 * Открывает модальное окно для добавления или редактирования слайда.
	 * Синхронизирует currentSlideId с ProductManager.
	 * 
	 * @param {string|null} slideId — ID слайда или null для создания нового
	 */
	openModal( slideId = null ) {
		const modal = document.getElementById( 'promoSlideModal' );
		if ( !modal ) return;

		const form = document.getElementById( 'promoSlideForm' );
		if ( form ) form.reset();
		this.clearImagePreview();
		this.currentEditId = slideId;

		// Синхронизация с ProductManager (если есть на странице)
		if ( window.productManager ) {
			window.productManager.currentSlideId = slideId;
			console.log( '🔗 Синхронизация: ProductManager.currentSlideId =', slideId );
		}

		if ( slideId ) {
			const slides = store.getPromoSlides();
			const slide = slides.find( s => s.id == slideId );
			if ( slide ) {
				document.getElementById( 'promoSlideModalTitle' ).textContent = 'Редактировать слайд';
				this.fillForm( slide );
			}
		} else {
			document.getElementById( 'promoSlideModalTitle' ).textContent = 'Добавить слайд';
		}

		modal.style.display = 'flex';
		modal.classList.add( 'show' );
	}

	/**
	 * Заполняет форму модального окна данными существующего слайда.
	 * 
	 * @param {Object} slide — объект слайда
	 */
	fillForm( slide ) {
		document.getElementById( 'slideTitle' ).value = slide.title;
		document.getElementById( 'slideDescription' ).value = slide.description;
		document.getElementById( 'slidePrice' ).value = slide.price || '';
		document.getElementById( 'slideLink' ).value = slide.link || '';
		document.getElementById( 'slideOrder' ).value = slide.order;
		document.getElementById( 'slideStatus' ).value = slide.status;

		if ( slide.image ) {
			this.updateImagePreview( slide.image );
			document.getElementById( 'slideImageUrl' ).value = slide.image;
		}
	}

	// =========================================================================
	// 3. РАБОТА С ИЗОБРАЖЕНИЯМИ В АДМИНКЕ
	// =========================================================================

	/**
	 * Очищает превью изображения и показывает плейсхолдер загрузки.
	 */
	clearImagePreview() {
		const previewContainer = document.getElementById( 'slidePreviewContainer' );
		const previewImg = document.getElementById( 'slidePreviewImage' );
		const clearBtn = document.getElementById( 'clearPreviewBtn' );
		const uploadPlaceholder = document.querySelector( '#slideImageUpload .upload-placeholder' );
		const loadingPlaceholder = document.querySelector( '#slideImageUpload .loading-placeholder' );

		// Освобождаем временный URL
		if ( this.currentPreviewUrl ) {
			URL.revokeObjectURL( this.currentPreviewUrl );
			this.currentPreviewUrl = null;
		}

		if ( loadingPlaceholder ) loadingPlaceholder.style.display = 'none';
		if ( previewContainer ) previewContainer.style.display = 'none';
		if ( uploadPlaceholder ) uploadPlaceholder.style.display = 'flex';
		if ( clearBtn ) clearBtn.style.display = 'none';

		if ( previewImg ) {
			previewImg.src = '';
			previewImg.style.display = 'none';
		}

		const imageUrl = document.getElementById( 'slideImageUrl' );
		if ( imageUrl ) imageUrl.value = '';
	}

	/**
	 * Обновляет превью изображения в модальном окне.
	 * 
	 * @param {string} src — путь к изображению или временный blob-URL
	 */
	updateImagePreview( src ) {
		const previewContainer = document.getElementById( 'slidePreviewContainer' );
		const previewImg = document.getElementById( 'slidePreviewImage' );
		const clearBtn = document.getElementById( 'clearPreviewBtn' );
		const uploadPlaceholder = document.querySelector( '#slideImageUpload .upload-placeholder' );
		const loadingPlaceholder = document.querySelector( '#slideImageUpload .loading-placeholder' );

		if ( !src || !src.trim() ) {
			if ( loadingPlaceholder ) loadingPlaceholder.style.display = 'none';
			if ( previewContainer ) previewContainer.style.display = 'none';
			if ( uploadPlaceholder ) uploadPlaceholder.style.display = 'flex';
			if ( clearBtn ) clearBtn.style.display = 'none';
			return;
		}

		if ( uploadPlaceholder ) uploadPlaceholder.style.display = 'none';
		if ( loadingPlaceholder ) loadingPlaceholder.style.display = 'none';

		if ( previewContainer ) previewContainer.style.display = 'flex';

		if ( previewImg ) {
			previewImg.src = src;
			previewImg.style.display = 'block';
		}

		if ( clearBtn ) clearBtn.style.display = 'flex';
	}

	/**
	 * Обрабатывает загрузку файла изображения для слайда.
	 * Создаёт временный URL для превью, сохраняет путь в скрытое поле.
	 * 
	 * @param {File} file — загруженный файл
	 */
	handleImageUpload( file ) {
		if ( !file ) return;

		// Проверка типа файла
		if ( !file.type.startsWith( 'image/' ) ) {
			API.showNotification( 'Пожалуйста, выберите изображение', 'error' );
			return;
		}

		// Проверка размера (максимум 5MB)
		if ( file.size > 5 * 1024 * 1024 ) {
			const sizeMB = ( file.size / 1024 / 1024 ).toFixed( 2 );
			API.showNotification( `Размер файла (${sizeMB} MB) превышает лимит в 5MB`, 'error' );
			return;
		}

		// Показываем индикатор загрузки
		const loadingPlaceholder = document.querySelector( '#slideImageUpload .loading-placeholder' );
		const uploadPlaceholder = document.querySelector( '#slideImageUpload .upload-placeholder' );

		if ( loadingPlaceholder ) loadingPlaceholder.style.display = 'flex';
		if ( uploadPlaceholder ) uploadPlaceholder.style.display = 'none';

		const fileName = file.name;
		const imagePath = `/image/${fileName}`;

		// Очищаем предыдущий временный URL
		if ( this.currentPreviewUrl ) {
			URL.revokeObjectURL( this.currentPreviewUrl );
		}

		// Создаём временный URL для превью (не base64!)
		const previewUrl = URL.createObjectURL( file );
		this.currentPreviewUrl = previewUrl;

		// Показываем превью
		this.updateImagePreview( previewUrl );

		// Сохраняем ПУТЬ в скрытое поле (не base64!)
		document.getElementById( 'slideImageUrl' ).value = imagePath;

		// Скрываем индикатор загрузки
		if ( loadingPlaceholder ) loadingPlaceholder.style.display = 'none';

		API.showNotification( `Изображение выбрано: ${fileName}`, 'success' );
	}

	// =========================================================================
	// 4. СОХРАНЕНИЕ И УДАЛЕНИЕ СЛАЙДОВ
	// =========================================================================

	/**
	 * Сохраняет слайд (создаёт новый или обновляет существующий).
	 * Выполняет валидацию перед сохранением.
	 */
	saveSlide() {
		// Проверка доступности store
		if ( !store || !store.addPromoSlide || !store.updatePromoSlide ) {
			console.error( '❌ store не доступен! Слайд не сохранён.' );
			return;
		}

		console.log( '💾 Сохранение слайда...' );

		const title = document.getElementById( 'slideTitle' )?.value.trim();
		const description = document.getElementById( 'slideDescription' )?.value.trim();
		const price = document.getElementById( 'slidePrice' )?.value.trim();
		const link = document.getElementById( 'slideLink' )?.value.trim();
		const order = parseInt( document.getElementById( 'slideOrder' )?.value ) || 0;
		const status = document.getElementById( 'slideStatus' )?.value;
		const image = document.getElementById( 'slideImageUrl' )?.value;

		// Валидация: обязательные поля
		if ( !title || !description ) {
			API.showNotification( 'Заполните заголовок и описание слайда', 'error' );
			return;
		}

		// Валидация: изображение обязательно
		if ( !image ) {
			API.showNotification( 'Выберите изображение для слайда', 'error' );
			return;
		}

		// Валидация: запрет base64 (должен быть путь к файлу)
		if ( image.startsWith( 'data:image' ) ) {
			API.showNotification( '❌ Ошибка: обнаружены данные base64. Пожалуйста, выберите файл заново.', 'error' );
			return;
		}

		// Сохраняем
		if ( this.currentEditId ) {
			store.updatePromoSlide( this.currentEditId, {
				title, description, price: price || '', link: link || '',
				order, status, image
			} );
			API.showNotification( '✅ Слайд обновлён!', 'success' );
		} else {
			store.addPromoSlide( {
				title, description, price: price || '', link: link || '',
				order, status, image
			} );
			API.showNotification( '✅ Слайд добавлен!', 'success' );
		}

		this.closeModal();
		this.renderSlidesList();
	}

	/**
	 * Открывает модальное окно подтверждения удаления слайда.
	 * 
	 * @param {string} id — ID слайда для удаления
	 */
	deleteSlide( id ) {
		const slides = store.getPromoSlides();
		const slide = slides.find( s => s.id == id );
		if ( !slide ) return;

		document.getElementById( 'deleteSlideTitle' ).textContent = slide.title;
		this.currentEditId = id;

		const modal = document.getElementById( 'deletePromoSlideModal' );
		if ( modal ) {
			modal.style.display = 'flex';
			modal.classList.add( 'show' );
		}
	}

	/**
	 * Подтверждает удаление слайда.
	 */
	confirmDelete() {
		if ( this.currentEditId ) {
			store.deletePromoSlide( this.currentEditId );
			API.showNotification( '✅ Слайд удалён!', 'success' );
			this.closeDeleteModal();
			this.renderSlidesList();
		}
	}

	/**
	 * Закрывает модальное окно редактирования слайда.
	 * Сбрасывает currentSlideId в ProductManager.
	 */
	closeModal() {
		const modal = document.getElementById( 'promoSlideModal' );
		if ( modal ) {
			modal.style.display = 'none';
			modal.classList.remove( 'show' );
		}
		this.currentEditId = null;

		// Синхронизация: сбрасываем ID в ProductManager
		if ( window.productManager ) {
			window.productManager.currentSlideId = null;
		}

		this.clearImagePreview();
	}

	/**
	 * Закрывает модальное окно подтверждения удаления.
	 */
	closeDeleteModal() {
		const modal = document.getElementById( 'deletePromoSlideModal' );
		if ( modal ) {
			modal.style.display = 'none';
			modal.classList.remove( 'show' );
		}
		this.currentEditId = null;
	}

	// =========================================================================
	// 5. ПРИВЯЗКА СОБЫТИЙ АДМИНКИ
	// =========================================================================

	/**
	 * Привязывает обработчики событий для админ-панели.
	 * Использует делегирование где возможно.
	 */
	bindAdminEvents() {
		console.log( '🔗 Привязка событий админки...' );

		// Кнопка «Добавить слайд»
		const addBtn = document.getElementById( 'addPromoSlideBtn' );
		if ( addBtn ) addBtn.onclick = () => this.openModal();

		// Делегирование: редактирование и удаление
		document.addEventListener( 'click', ( e ) => {
			const editBtn = e.target.closest( '.edit-slide' );
			if ( editBtn ) {
				e.preventDefault();
				this.openModal( editBtn.dataset.id );
			}

			const deleteBtn = e.target.closest( '.delete-slide' );
			if ( deleteBtn ) {
				e.preventDefault();
				this.deleteSlide( deleteBtn.dataset.id );
			}
		} );

		// Загрузка изображения
		const uploadArea = document.getElementById( 'slideImageUpload' );
		const imageFile = document.getElementById( 'slideImageFile' );
		const clearBtn = document.getElementById( 'clearPreviewBtn' );

		if ( uploadArea && imageFile ) {
			uploadArea.onclick = () => imageFile.click();

			imageFile.onchange = ( e ) => {
				if ( e.target.files[0] ) {
					this.handleImageUpload( e.target.files[0] );
				}
				// Очищаем input, чтобы можно было выбрать тот же файл повторно
				imageFile.value = '';
			};
		}

		// Кнопка очистки превью
		if ( clearBtn ) {
			clearBtn.onclick = () => {
				this.clearImagePreview();
				document.getElementById( 'slideImageUrl' ).value = '';
				if ( imageFile ) imageFile.value = '';
			};
		}

		// Кнопки модального окна
		const saveBtn = document.getElementById( 'savePromoSlideBtn' );
		if ( saveBtn ) saveBtn.onclick = () => this.saveSlide();

		const cancelBtn = document.getElementById( 'cancelPromoSlideBtn' );
		if ( cancelBtn ) cancelBtn.onclick = () => this.closeModal();

		const closeBtn = document.getElementById( 'closePromoSlideModal' );
		if ( closeBtn ) closeBtn.onclick = () => this.closeModal();

		// Закрытие по клику на оверлей
		const modal = document.getElementById( 'promoSlideModal' );
		if ( modal ) {
			modal.onclick = ( e ) => {
				if ( e.target === modal ) this.closeModal();
			};
		}

		// Модальное окно удаления
		const confirmDeleteBtn = document.getElementById( 'confirmDeletePromoSlideBtn' );
		if ( confirmDeleteBtn ) confirmDeleteBtn.onclick = () => this.confirmDelete();

		const cancelDeleteBtn = document.getElementById( 'cancelDeletePromoSlideBtn' );
		if ( cancelDeleteBtn ) cancelDeleteBtn.onclick = () => this.closeDeleteModal();

		const closeDeleteBtn = document.getElementById( 'closeDeletePromoSlideModal' );
		if ( closeDeleteBtn ) closeDeleteBtn.onclick = () => this.closeDeleteModal();

		// Закрытие модального окна удаления по клику на оверлей
		const deleteModal = document.getElementById( 'deletePromoSlideModal' );
		if ( deleteModal ) {
			deleteModal.onclick = ( e ) => {
				if ( e.target === deleteModal ) this.closeDeleteModal();
			};
		}
	}

	// =========================================================================
	// 6. ФРОНТЕНД — РЕНДЕРИНГ СЛАЙДОВ НА ГЛАВНОЙ
	// =========================================================================

	/**
	 * Инициализирует режим отображения слайдов на главной странице.
	 */
	initFrontend() {
		console.log( '🏠 Режим отображения промо-слайдов' );
		this.loadAndRenderSlides();
		this.initAccordion();

		// Подписываемся на обновления слайдов из админки
		window.addEventListener( 'promoslides:updated', () => {
			console.log( '🔄 Слайды обновлены, перезагружаем...' );
			this.loadAndRenderSlides();
			this.initAccordion();
		} );
	}

	/**
	 * Загружает активные слайды из store и рендерит их в контейнер.
	 * Первый слайд загружает фон сразу, остальные — лениво через Intersection Observer.
	 */
	loadAndRenderSlides() {
		const container = document.querySelector( '.accordion-logo__container' );
		if ( !container ) return;

		const slides = store.getActivePromoSlides();

		if ( slides.length > 0 ) {
			container.innerHTML = '';

			slides.forEach( ( slide, index ) => {
				// Первый слайд загружаем сразу, остальные — через data-bg (ленивая загрузка)
				const bgAttribute = index === 0
					? `style="background-image: url('${this.escapeHtml( slide.image )}');"`
					: `data-bg="${this.escapeHtml( slide.image )}"`;

				const slideHtml = `
					<div class="accordion-item" data-slide-index="${index}" ${bgAttribute}>
						<div class="item-content">
							<h2>${this.escapeHtml( slide.title )}</h2>
							<p>${this.escapeHtml( slide.description )}</p>
							${slide.price ? `<span class="price">${this.escapeHtml( slide.price )}</span>` : ''}
							${slide.link ? `<a href="${this.escapeHtml( slide.link )}" class="slide-link"></a>` : ''}
						</div>
					</div>
				`;
				container.insertAdjacentHTML( 'beforeend', slideHtml );
			} );

			// Запускаем ленивую загрузку фонов для слайдов после первого
			this.initSlidesLazyLoading( container );
			this.updateNavigationDots( slides.length );
			console.log( `✅ Отрендерено ${slides.length} слайдов` );
		} else {
			container.innerHTML = '<div class="no-slides">Нет активных слайдов</div>';
			this.updateNavigationDots( 0 );
		}
	}

	/**
	 * ЛЕНИВАЯ ЗАГРУЗКА ФОНОВ ДЛЯ СЛАЙДОВ.
	 * Использует Intersection Observer, чтобы не загружать все фоны сразу.
	 * Первый слайд уже загружен (фон задан инлайново), остальные ждут очереди.
	 * Когда слайд приближается к видимой области — фон подставляется из data-bg.
	 * 
	 * @param {HTMLElement} container — контейнер со слайдами
	 */
	initSlidesLazyLoading( container ) {
		// Находим все слайды, у которых есть data-bg (все кроме первого)
		const lazySlides = container.querySelectorAll( '.accordion-item[data-bg]' );
		if ( !lazySlides.length ) return;

		console.log( `🖼️ Ленивая загрузка фонов для ${lazySlides.length} слайдов` );

		const bgObserver = new IntersectionObserver( ( entries ) => {
			entries.forEach( entry => {
				if ( entry.isIntersecting ) {
					const slide = entry.target;
					const bgUrl = slide.dataset.bg;

					if ( bgUrl ) {
						// Подставляем фон
						slide.style.backgroundImage = `url('${bgUrl}')`;
						// Удаляем data-bg за ненадобностью
						slide.removeAttribute( 'data-bg' );
						console.log( `🖼️ Фон загружен для слайда #${slide.dataset.slideIndex}` );
					}

					// Прекращаем наблюдение за этим слайдом
					bgObserver.unobserve( slide );
				}
			} );
		}, {
			rootMargin: '300px',  // Начинаем загрузку за 300px до появления
			threshold: 0.01       // Достаточно 1% видимости
		} );

		lazySlides.forEach( slide => bgObserver.observe( slide ) );
	}

	/**
	 * Обновляет навигационные точки (индикаторы) под слайдами.
	 * 
	 * @param {number} count — количество слайдов
	 */
	updateNavigationDots( count ) {
		const navIndicators = document.querySelector( '.custom-navigation .nav-indicators' );
		if ( !navIndicators ) return;

		navIndicators.innerHTML = '';
		for ( let i = 0; i < count; i++ ) {
			const dot = document.createElement( 'div' );
			dot.className = 'nav-dot' + ( i === 0 ? ' active' : '' );
			dot.dataset.index = i;
			navIndicators.appendChild( dot );
		}
	}

	// =========================================================================
	// 7. АККОРДЕОН — ЛОГИКА ПРОКРУТКИ И АВТОПЛЕЯ
	// =========================================================================

	/**
	 * Инициализирует аккордеон: автопрокрутку, навигационные точки,
	 * обработку касаний и скролла.
	 */
	initAccordion() {
		const container = document.querySelector( '.accordion-logo__container' );
		if ( !container ) {
			console.warn( '⚠️ Аккордеон: контейнер не найден' );
			return;
		}

		const navDots = document.querySelectorAll( '.nav-dot' );
		const totalItems = navDots.length;

		if ( totalItems === 0 ) {
			console.warn( '⚠️ Аккордеон: нет навигационных точек' );
			return;
		}

		console.log( `🎯 Аккордеон: инициализация с ${totalItems} слайдами` );

		// Очищаем предыдущий таймер если был
		if ( this.autoPlayInterval ) {
			clearInterval( this.autoPlayInterval );
			this.autoPlayInterval = null;
		}

		let currentIndex = 0;
		let isUserInteracting = false;
		let scrollAnimationFrame = null;
		let scrollEndTimer = null;

		/**
		 * Обновляет активную навигационную точку на основе позиции скролла.
		 * Использует requestAnimationFrame для оптимизации производительности.
		 */
		const updateActiveNav = () => {
			if ( scrollAnimationFrame ) cancelAnimationFrame( scrollAnimationFrame );
			scrollAnimationFrame = requestAnimationFrame( () => {
				const scrollLeft = container.scrollLeft;
				const itemWidth = container.clientWidth;
				if ( itemWidth === 0 ) return;

				const activeIndex = Math.round( scrollLeft / itemWidth );
				if ( activeIndex >= 0 && activeIndex < totalItems ) {
					currentIndex = activeIndex;
					navDots.forEach( ( dot, index ) => {
						dot.classList.toggle( 'active', index === activeIndex );
					} );
				}
			} );
		};

		/**
		 * Переключает на следующий слайд.
		 * После последнего — возвращается к первому.
		 */
		const nextSlide = () => {
			if ( isUserInteracting ) return;
			const itemWidth = container.clientWidth;
			if ( itemWidth === 0 ) return;
			let nextIndex = currentIndex + 1;
			if ( nextIndex >= totalItems ) nextIndex = 0;
			container.scrollTo( { left: itemWidth * nextIndex, behavior: 'smooth' } );
		};

		/**
		 * Запускает автоматическую прокрутку.
		 * Интервал: 10 секунд — достаточно для чтения короткого рекламного текста.
		 */
		const startAutoPlay = () => {
			if ( this.autoPlayInterval ) clearInterval( this.autoPlayInterval );
			this.autoPlayInterval = setInterval( nextSlide, 10000 );
		};

		/**
		 * Останавливает автоматическую прокрутку.
		 */
		const stopAutoPlay = () => {
			if ( this.autoPlayInterval ) {
				clearInterval( this.autoPlayInterval );
				this.autoPlayInterval = null;
			}
		};

		/**
		 * Приостанавливает автопрокрутку на указанное время.
		 * Используется после ручного взаимодействия пользователя.
		 * 
		 * @param {number} duration — время паузы в миллисекундах
		 */
		const pauseAutoPlay = ( duration = 2000 ) => {
			stopAutoPlay();
			isUserInteracting = true;
			setTimeout( () => {
				isUserInteracting = false;
				startAutoPlay();
			}, duration );
		};

		// Обработчик скролла — обновляет навигацию и служит fallback для Safari
		container.removeEventListener( 'scroll', updateActiveNav );
		container.addEventListener( 'scroll', () => {
			updateActiveNav();
			// Fallback для браузеров без поддержки scrollend (Safari < 15.4)
			clearTimeout( scrollEndTimer );
			scrollEndTimer = setTimeout( updateActiveNav, 150 );
		} );

		// Клик по навигационным точкам
		navDots.forEach( ( dot, index ) => {
			dot.removeEventListener( 'click', dot._clickHandler );
			dot._clickHandler = () => {
				const itemWidth = container.clientWidth;
				if ( itemWidth === 0 ) return;
				container.scrollTo( { left: itemWidth * index, behavior: 'smooth' } );
				pauseAutoPlay( 3000 );
			};
			dot.addEventListener( 'click', dot._clickHandler );
		} );

		// Пауза при наведении на навигационные точки
		const navContainer = document.querySelector( '.custom-navigation' );
		if ( navContainer ) {
			navContainer.removeEventListener( 'mouseenter', stopAutoPlay );
			navContainer.removeEventListener( 'mouseleave', startAutoPlay );
			navContainer.addEventListener( 'mouseenter', () => {
				stopAutoPlay();
				isUserInteracting = true;
			} );
			navContainer.addEventListener( 'mouseleave', () => {
				isUserInteracting = false;
				startAutoPlay();
			} );
		}

		// Обработка касаний на мобильных устройствах
		container.addEventListener( 'touchstart', () => {
			stopAutoPlay();
			isUserInteracting = true;
		} );
		container.addEventListener( 'touchend', () => {
			setTimeout( () => {
				isUserInteracting = false;
				startAutoPlay();
			}, 3000 );
		} );

		// Обновление навигации при изменении размера окна
		window.removeEventListener( 'resize', updateActiveNav );
		window.addEventListener( 'resize', updateActiveNav );

		// Первичное обновление и запуск
		updateActiveNav();
		startAutoPlay();

		this.accordionInitialized = true;
		console.log( '✅ Аккордеон успешно инициализирован' );
	}

	// =========================================================================
	// 8. УТИЛИТЫ
	// =========================================================================

	/**
	 * Экранирует HTML-спецсимволы для безопасной вставки в DOM.
	 * Защищает от XSS при рендеринге пользовательских данных.
	 * 
	 * @param {string} str — исходная строка
	 * @returns {string} экранированная строка
	 */
	escapeHtml( str ) {
		if ( !str ) return '';
		return str.replace( /[&<>"']/g, function ( m ) {
			switch ( m ) {
				case '&': return '&amp;';
				case '<': return '&lt;';
				case '>': return '&gt;';
				case '"': return '&quot;';
				case "'": return '&#039;';
				default: return m;
			}
		} );
	}
}

// =========================================================================
// 9. ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
// =========================================================================

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', () => {
		window.promoSlidesManager = new PromoSlidesManager();
		console.log( '✅ Модуль промо-слайдов инициализирован (DOMContentLoaded)' );
	} );
} else {
	window.promoSlidesManager = new PromoSlidesManager();
	console.log( '✅ Модуль промо-слайдов инициализирован (immediate)' );
}