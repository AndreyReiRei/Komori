/**
 * Скрипт для аккордеон-скролла с навигационными индикаторами
 * Использует store.js для хранения слайдов
 */
class PromoSlidesManager {
	constructor() {
		this.currentEditId = null;
		this.autoPlayInterval = null;
		this.accordionInitialized = false;
		this.currentPreviewUrl = null; // Для хранения временного URL превью

		// Определяем, где мы находимся
		this.isAdmin = !!document.getElementById( 'promoSlidesList' );

		if ( this.isAdmin ) {
			this.initAdmin();
		} else {
			this.initFrontend();
		}
	}

	// =========================================================================
	// АДМИНКА
	// =========================================================================

	initAdmin() {
		console.log( '🖥️ Режим администрирования промо-слайдов' );
		this.renderSlidesList();
		this.bindAdminEvents();

		// Слушаем обновление слайдов
		window.addEventListener( 'promoslides:updated', () => {
			this.renderSlidesList();
		} );
	}

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

	renderSlideItem( slide ) {
		const statusText = slide.status === 'active' ? 'Активен' : 'Неактивен';
		const statusClass = slide.status;

		return `
            <div class="slide-item" data-id="${slide.id}" data-order="${slide.order}">
                <div class="drag-handle">
                    <i class="fas fa-grip-vertical"></i>
                </div>
                <div class="slide-preview">
                    ${slide.image ?
				`<img src="${slide.image}" alt="${slide.title}" onerror="this.src='/image/no-image.jpg'">` :
				'<div class="slide-preview-placeholder"><i class="fas fa-image"></i></div>'
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

	/**
	 * Открывает модальное окно для добавления или редактирования слайда
	 * Синхронизирует currentSlideId с ProductManager
	 * @param {string|null} slideId - ID слайда или null для нового
	 */
	openModal( slideId = null ) {
		const modal = document.getElementById( 'promoSlideModal' );
		if ( !modal ) return;

		const form = document.getElementById( 'promoSlideForm' );
		if ( form ) form.reset();
		this.clearImagePreview();
		this.currentEditId = slideId;

		// ===== СИНХРОНИЗАЦИЯ С ProductManager =====
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

	fillForm( slide ) {
		document.getElementById( 'slideTitle' ).value = slide.title;
		document.getElementById( 'slideDescription' ).value = slide.description;
		document.getElementById( 'slidePrice' ).value = slide.price || '';
		document.getElementById( 'slideLink' ).value = slide.link || '';
		document.getElementById( 'slideOrder' ).value = slide.order;
		document.getElementById( 'slideStatus' ).value = slide.status;

		if ( slide.image ) {
			// Для редактирования используем путь из слайда
			this.updateImagePreview( slide.image );
			document.getElementById( 'slideImageUrl' ).value = slide.image;
		}
	}

	// ========== РАБОТА С ИЗОБРАЖЕНИЯМИ ==========

	/**
	 * Очищает превью изображения и показывает плейсхолдер
	 */
	clearImagePreview() {
		const previewContainer = document.getElementById( 'slidePreviewContainer' );
		const previewImg = document.getElementById( 'slidePreviewImage' );
		const clearBtn = document.getElementById( 'clearPreviewBtn' );
		const uploadPlaceholder = document.querySelector( '#slideImageUpload .upload-placeholder' );
		const loadingPlaceholder = document.querySelector( '#slideImageUpload .loading-placeholder' );

		// Очищаем временный URL
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
	 * Обновляет превью изображения
	 * @param {string} src - путь к изображению или временный URL
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

		// Скрываем плейсхолдер и индикатор загрузки
		if ( uploadPlaceholder ) uploadPlaceholder.style.display = 'none';
		if ( loadingPlaceholder ) loadingPlaceholder.style.display = 'none';

		// Показываем контейнер превью
		if ( previewContainer ) previewContainer.style.display = 'flex';

		// Устанавливаем изображение
		if ( previewImg ) {
			previewImg.src = src;
			previewImg.style.display = 'block';
		}

		// Показываем кнопку очистки
		if ( clearBtn ) clearBtn.style.display = 'flex';
	}

	/**
	 * Обработка загрузки файла изображения
	 * @param {File} file - загруженный файл
	 */
	handleImageUpload( file ) {
		if ( !file ) return;

		if ( !file.type.startsWith( 'image/' ) ) {
			API.showNotification( 'Пожалуйста, выберите изображение', 'error' );
			return;
		}

		// Проверка размера (макс 5MB)
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
		// Формируем путь к файлу в папке /image/
		const imagePath = `/image/${fileName}`;

		// Очищаем предыдущий временный URL
		if ( this.currentPreviewUrl ) {
			URL.revokeObjectURL( this.currentPreviewUrl );
		}

		// Создаем временный URL для превью
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

	/**
 * Сохраняет слайд (создаёт новый или обновляет существующий)
 */
	saveSlide() {
		// Проверка что store доступен
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

		// Валидация
		if ( !title || !description ) {
			API.showNotification( 'Заполните заголовок и описание слайда', 'error' );
			return;
		}

		if ( !image ) {
			API.showNotification( 'Выберите изображение для слайда', 'error' );
			return;
		}

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
	 * Открывает модальное окно подтверждения удаления слайда
	 * @param {string} id - ID слайда
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
	 * Подтверждает удаление слайда
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
	 * Закрывает модальное окно слайда
	 * Сбрасывает currentSlideId в ProductManager
	 */
	closeModal() {
		const modal = document.getElementById( 'promoSlideModal' );
		if ( modal ) {
			modal.style.display = 'none';
			modal.classList.remove( 'show' );
		}
		this.currentEditId = null;

		// ===== СИНХРОНИЗАЦИЯ: сбрасываем ID в ProductManager =====
		if ( window.productManager ) {
			window.productManager.currentSlideId = null;
		}

		this.clearImagePreview();
	}

	/**
	 * Закрывает модальное окно подтверждения удаления
	 */
	closeDeleteModal() {
		const modal = document.getElementById( 'deletePromoSlideModal' );
		if ( modal ) {
			modal.style.display = 'none';
			modal.classList.remove( 'show' );
		}
		this.currentEditId = null;
	}

	bindAdminEvents() {
		console.log( '🔗 Привязка событий админки...' );

		// Кнопка добавления
		const addBtn = document.getElementById( 'addPromoSlideBtn' );
		if ( addBtn ) addBtn.onclick = () => this.openModal();

		// Редактирование/удаление через делегирование
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
			// Клик по области загрузки
			uploadArea.onclick = () => imageFile.click();

			// Выбор файла
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

		// Оверлей модального окна
		const modal = document.getElementById( 'promoSlideModal' );
		if ( modal ) modal.onclick = ( e ) => {
			if ( e.target === modal ) this.closeModal();
		};

		// Модальное окно удаления
		const confirmDeleteBtn = document.getElementById( 'confirmDeletePromoSlideBtn' );
		if ( confirmDeleteBtn ) confirmDeleteBtn.onclick = () => this.confirmDelete();

		const cancelDeleteBtn = document.getElementById( 'cancelDeletePromoSlideBtn' );
		if ( cancelDeleteBtn ) cancelDeleteBtn.onclick = () => this.closeDeleteModal();

		const closeDeleteBtn = document.getElementById( 'closeDeletePromoSlideModal' );
		if ( closeDeleteBtn ) closeDeleteBtn.onclick = () => this.closeDeleteModal();

		// Оверлей модального окна удаления
		const deleteModal = document.getElementById( 'deletePromoSlideModal' );
		if ( deleteModal ) deleteModal.onclick = ( e ) => {
			if ( e.target === deleteModal ) this.closeDeleteModal();
		};
	}

	// =========================================================================
	// ФРОНТЕНД (ГЛАВНАЯ СТРАНИЦА)
	// =========================================================================

	initFrontend() {
		console.log( '🏠 Режим отображения промо-слайдов' );
		this.loadAndRenderSlides();
		this.initAccordion();

		window.addEventListener( 'promoslides:updated', () => {
			console.log( '🔄 Слайды обновлены, перезагружаем...' );
			this.loadAndRenderSlides();
			this.initAccordion();
		} );
	}

	loadAndRenderSlides() {
		const container = document.querySelector( '.accordion-logo__container' );
		if ( !container ) return;

		const slides = store.getActivePromoSlides();

		if ( slides.length > 0 ) {
			container.innerHTML = '';
			slides.forEach( ( slide, index ) => {
				const slideHtml = `
                    <div class="accordion-item" style="background-image: url('${slide.image}');" data-slide-index="${index}">
                        <div class="item-content">
                            <h2>${this.escapeHtml( slide.title )}</h2>
                            <p>${this.escapeHtml( slide.description )}</p>
                            ${slide.price ? `<span class="price">${this.escapeHtml( slide.price )}</span>` : ''}
                            ${slide.link ? `<a href="${slide.link}" class="slide-link"></a>` : ''}
                        </div>
                    </div>
                `;
				container.insertAdjacentHTML( 'beforeend', slideHtml );
			} );
			this.updateNavigationDots( slides.length );
			console.log( `✅ Отрендерено ${slides.length} слайдов` );
		} else {
			container.innerHTML = '<div class="no-slides">Нет активных слайдов</div>';
			this.updateNavigationDots( 0 );
		}
	}

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

		if ( this.autoPlayInterval ) {
			clearInterval( this.autoPlayInterval );
			this.autoPlayInterval = null;
		}

		let currentIndex = 0;
		let isUserInteracting = false;
		let scrollAnimationFrame = null;

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

		const nextSlide = () => {
			if ( isUserInteracting ) return;
			const itemWidth = container.clientWidth;
			if ( itemWidth === 0 ) return;
			let nextIndex = currentIndex + 1;
			if ( nextIndex >= totalItems ) nextIndex = 0;
			container.scrollTo( { left: itemWidth * nextIndex, behavior: 'smooth' } );
		};

		const startAutoPlay = () => {
			if ( this.autoPlayInterval ) clearInterval( this.autoPlayInterval );
			this.autoPlayInterval = setInterval( nextSlide, 5000 );
		};

		const stopAutoPlay = () => {
			if ( this.autoPlayInterval ) {
				clearInterval( this.autoPlayInterval );
				this.autoPlayInterval = null;
			}
		};

		const pauseAutoPlay = ( duration = 2000 ) => {
			stopAutoPlay();
			isUserInteracting = true;
			setTimeout( () => {
				isUserInteracting = false;
				startAutoPlay();
			}, duration );
		};

		container.removeEventListener( 'scroll', updateActiveNav );
		container.addEventListener( 'scroll', updateActiveNav );

		navDots.forEach( ( dot, index ) => {
			dot.removeEventListener( 'click', dot._clickHandler );
			dot._clickHandler = () => {
				const itemWidth = container.clientWidth;
				if ( itemWidth === 0 ) return;
				container.scrollTo( { left: itemWidth * index, behavior: 'smooth' } );
				pauseAutoPlay( 2000 );
			};
			dot.addEventListener( 'click', dot._clickHandler );
		} );

		container.addEventListener( 'scrollend', updateActiveNav );

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

		container.addEventListener( 'touchstart', () => {
			stopAutoPlay();
			isUserInteracting = true;
		} );
		container.addEventListener( 'touchend', () => {
			setTimeout( () => {
				isUserInteracting = false;
				startAutoPlay();
			}, 2000 );
		} );

		window.removeEventListener( 'resize', updateActiveNav );
		window.addEventListener( 'resize', updateActiveNav );

		updateActiveNav();
		startAutoPlay();

		this.accordionInitialized = true;
		console.log( '✅ Аккордеон успешно инициализирован' );
	}

	escapeHtml( str ) {
		if ( !str ) return '';
		return str.replace( /[&<>]/g, function ( m ) {
			if ( m === '&' ) return '&amp;';
			if ( m === '<' ) return '&lt;';
			if ( m === '>' ) return '&gt;';
			return m;
		} );
	}
}

// Инициализация
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', () => {
		window.promoSlidesManager = new PromoSlidesManager();
		console.log( '✅ Модуль промо-слайдов инициализирован (DOMContentLoaded)' );
	} );
} else {
	window.promoSlidesManager = new PromoSlidesManager();
	console.log( '✅ Модуль промо-слайдов инициализирован (immediate)' );
}