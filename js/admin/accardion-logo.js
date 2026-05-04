/**
 * Скрипт для аккордеон-скролла с навигационными индикаторами
 * и автоматическим перелистыванием
 * Поддерживает загрузку слайдов из localStorage и управление ими в админке
 */

// ============================================================================
// ОСНОВНОЙ КЛАСС ДЛЯ УПРАВЛЕНИЯ ПРОМО-СЛАЙДАМИ
// ============================================================================

class PromoSlidesManager {
	constructor() {
		this.slides = [];
		this.currentEditId = null;
		this.accordionInitialized = false;

		// Определяем, где мы находимся (админка или главная страница)
		this.isAdmin = !!document.getElementById( 'promoSlidesList' );

		if ( this.isAdmin ) {
			this.initAdmin();
		} else {
			this.initFrontend();
		}
	}

	// =========================================================================
	// ИНИЦИАЛИЗАЦИЯ ДЛЯ АДМИНКИ
	// =========================================================================

	initAdmin() {
		console.log( '🖥️ Режим администрирования промо-слайдов' );
		this.loadSlides();
		this.renderSlidesList();
		this.bindAdminEvents();
	}

	loadSlides() {
		const saved = localStorage.getItem( 'komori_promo_slides' );
		if ( saved ) {
			this.slides = JSON.parse( saved );
		} else {
			// Добавляем демо-слайды
			this.slides = [
				{
					id: Date.now() + 1,
					title: 'Канцелярия',
					description: 'Широкий ассортимент канцелярии',
					price: '',
					link: '/pages html/catalog pages/office.html',
					image: '/image/kawai.jpg',
					order: 0,
					status: 'active',
					createdAt: new Date().toISOString()
				},
				{
					id: Date.now() + 2,
					title: 'Фигурки',
					description: 'Широкий ассортимент фигурок',
					price: '',
					link: '/pages html/catalog pages/figurines.html',
					image: '/image/figures.jpg',
					order: 1,
					status: 'active',
					createdAt: new Date().toISOString()
				},
				{
					id: Date.now() + 3,
					title: 'Одежда',
					description: 'Футболки / Худи / Свитшоты',
					price: '',
					link: '/pages html/catalog pages/clothes.html',
					image: '/image/T-shirt.webp',
					order: 2,
					status: 'active',
					createdAt: new Date().toISOString()
				},
				{
					id: Date.now() + 4,
					title: 'Музыка',
					description: 'Азиатская популярная музыка',
					price: '',
					link: '/pages html/catalog pages/music.html',
					image: '/image/BTS.jpg',
					order: 3,
					status: 'active',
					createdAt: new Date().toISOString()
				},
				{
					id: Date.now() + 5,
					title: 'Манга',
					description: 'Большой ассортимент книг и манги',
					price: '',
					link: '/pages html/catalog pages/manga.html',
					image: '/image/manga.jpg',
					order: 4,
					status: 'active',
					createdAt: new Date().toISOString()
				},
				{
					id: Date.now() + 6,
					title: 'Чай',
					description: 'Большой ассортимент чая',
					price: '',
					link: '/pages html/catalog pages/tea.html',
					image: '/image/tea.jpg',
					order: 5,
					status: 'active',
					createdAt: new Date().toISOString()
				},
				{
					id: Date.now() + 7,
					title: 'Посуда',
					description: 'Большой ассортимент посуды',
					price: '',
					link: '/pages html/catalog pages/dishes.html',
					image: '/image/sakura.jpg',
					order: 6,
					status: 'active',
					createdAt: new Date().toISOString()
				},
				{
					id: Date.now() + 8,
					title: 'Сладости',
					description: 'Большой ассортимент азиатской еды и сладостей',
					price: 'начиная от 15 ₽!',
					link: '/pages html/catalog pages/sweets.html',
					image: '/image/swits.jpg',
					order: 7,
					status: 'active',
					createdAt: new Date().toISOString()
				}
			];
			this.saveSlides();
		}
	}

	saveSlides() {
		localStorage.setItem( 'komori_promo_slides', JSON.stringify( this.slides ) );
		// Отправляем событие об обновлении слайдов для фронтенда
		window.dispatchEvent( new CustomEvent( 'promoslides:updated', { detail: this.slides } ) );
	}

	renderSlidesList() {
		const container = document.getElementById( 'promoSlidesList' );
		if ( !container ) return;

		const activeSlides = this.slides.filter( s => s.status === 'active' );
		const inactiveSlides = this.slides.filter( s => s.status === 'inactive' );
		const sortedSlides = [...activeSlides, ...inactiveSlides].sort( ( a, b ) => a.order - b.order );

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
				`<img src="${slide.image}" alt="${slide.title}" onerror="this.src='https://via.placeholder.com/80x60?text=No+Image'">` :
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

			item.addEventListener( 'dragend', ( e ) => {
				item.classList.remove( 'dragging' );
				draggedItem = null;
			} );

			item.addEventListener( 'dragover', ( e ) => {
				e.preventDefault();
				e.dataTransfer.dropEffect = 'move';
			} );

			item.addEventListener( 'dragenter', ( e ) => {
				e.preventDefault();
				if ( item !== draggedItem ) {
					item.classList.add( 'drag-over' );
				}
			} );

			item.addEventListener( 'dragleave', ( e ) => {
				item.classList.remove( 'drag-over' );
			} );

			item.addEventListener( 'drop', ( e ) => {
				e.preventDefault();
				item.classList.remove( 'drag-over' );

				if ( draggedItem && draggedItem !== item ) {
					const draggedId = parseInt( draggedItem.dataset.id );
					const targetId = parseInt( item.dataset.id );

					const draggedSlide = this.slides.find( s => s.id === draggedId );
					const targetSlide = this.slides.find( s => s.id === targetId );

					if ( draggedSlide && targetSlide ) {
						const draggedOrder = draggedSlide.order;
						draggedSlide.order = targetSlide.order;
						targetSlide.order = draggedOrder;

						this.saveSlides();
						this.renderSlidesList();
					}
				}
			} );
		} );
	}

	openModal( slideId = null ) {
		const modal = document.getElementById( 'promoSlideModal' );
		const title = document.getElementById( 'promoSlideModalTitle' );

		if ( !modal ) return;

		document.getElementById( 'promoSlideForm' )?.reset();
		this.currentEditId = slideId;
		this.clearImagePreview();

		if ( slideId ) {
			const slide = this.slides.find( s => s.id == slideId );
			if ( slide ) {
				title.textContent = 'Редактировать слайд';
				this.fillForm( slide );
			}
		} else {
			title.textContent = 'Добавить слайд';
		}

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
			this.updateImagePreview( slide.image );
			document.getElementById( 'slideImageUrl' ).value = slide.image;
		}
	}

	clearImagePreview() {
		const preview = document.getElementById( 'slideImagePreview' );
		if ( preview ) {
			preview.innerHTML = `
                <i class="fas fa-cloud-upload-alt"></i>
                <span>Нажмите для загрузки изображения</span>
            `;
		}
		const imageUrl = document.getElementById( 'slideImageUrl' );
		if ( imageUrl ) imageUrl.value = '';
	}

	updateImagePreview( src ) {
		const preview = document.getElementById( 'slideImagePreview' );
		if ( preview ) {
			preview.innerHTML = `<img src="${src}" alt="Preview">`;
		}
	}

	handleImageUpload( file ) {
		if ( !file ) return;

		if ( !file.type.startsWith( 'image/' ) ) {
			API.showNotification( 'Пожалуйста, выберите изображение', 'error' );
			return;
		}

		if ( file.size > 5 * 1024 * 1024 ) {
			API.showNotification( 'Размер файла не должен превышать 5MB', 'error' );
			return;
		}

		const reader = new FileReader();
		reader.onload = ( e ) => {
			const imageData = e.target.result;
			this.updateImagePreview( imageData );
			document.getElementById( 'slideImageUrl' ).value = imageData;
			API.showNotification( 'Изображение загружено', 'success' );
		};
		reader.onerror = () => {
			API.showNotification( 'Ошибка загрузки изображения', 'error' );
		};
		reader.readAsDataURL( file );
	}

	saveSlide() {
		const title = document.getElementById( 'slideTitle' ).value.trim();
		const description = document.getElementById( 'slideDescription' ).value.trim();
		const price = document.getElementById( 'slidePrice' ).value.trim();
		const link = document.getElementById( 'slideLink' ).value.trim();
		const order = parseInt( document.getElementById( 'slideOrder' ).value ) || 0;
		const status = document.getElementById( 'slideStatus' ).value;
		const image = document.getElementById( 'slideImageUrl' ).value;

		if ( !title || !description || !image ) {
			API.showNotification( 'Заполните все обязательные поля', 'error' );
			return;
		}

		if ( this.currentEditId ) {
			const index = this.slides.findIndex( s => s.id == this.currentEditId );
			if ( index !== -1 ) {
				this.slides[index] = {
					...this.slides[index],
					title,
					description,
					price,
					link,
					order,
					status,
					image,
					updatedAt: new Date().toISOString()
				};
				API.showNotification( 'Слайд обновлен', 'success' );
			}
		} else {
			const newSlide = {
				id: Date.now(),
				title,
				description,
				price,
				link,
				order,
				status,
				image,
				createdAt: new Date().toISOString()
			};
			this.slides.push( newSlide );
			API.showNotification( 'Слайд добавлен', 'success' );
		}

		this.saveSlides();
		this.renderSlidesList();
		this.closeModal();
	}

	deleteSlide( id ) {
		const slide = this.slides.find( s => s.id == id );
		if ( !slide ) return;

		document.getElementById( 'deleteSlideTitle' ).textContent = slide.title;
		this.currentEditId = id;

		const modal = document.getElementById( 'deletePromoSlideModal' );
		if ( modal ) modal.classList.add( 'show' );
	}

	confirmDelete() {
		if ( this.currentEditId ) {
			this.slides = this.slides.filter( s => s.id != this.currentEditId );
			this.slides.forEach( ( slide, index ) => {
				slide.order = index;
			} );
			this.saveSlides();
			this.renderSlidesList();
			API.showNotification( 'Слайд удален', 'success' );
			this.closeDeleteModal();
		}
	}

	closeModal() {
		const modal = document.getElementById( 'promoSlideModal' );
		if ( modal ) modal.classList.remove( 'show' );
		this.currentEditId = null;
	}

	closeDeleteModal() {
		const modal = document.getElementById( 'deletePromoSlideModal' );
		if ( modal ) modal.classList.remove( 'show' );
		this.currentEditId = null;
	}

	bindAdminEvents() {
		// Кнопка добавления
		const addBtn = document.getElementById( 'addPromoSlideBtn' );
		if ( addBtn ) {
			addBtn.addEventListener( 'click', () => this.openModal() );
		}

		// Редактирование/удаление через делегирование
		document.addEventListener( 'click', ( e ) => {
			const editBtn = e.target.closest( '.edit-slide' );
			if ( editBtn ) {
				this.openModal( editBtn.dataset.id );
			}

			const deleteBtn = e.target.closest( '.delete-slide' );
			if ( deleteBtn ) {
				this.deleteSlide( deleteBtn.dataset.id );
			}
		} );

		// Загрузка изображения
		const uploadArea = document.getElementById( 'slideImageUpload' );
		const imageFile = document.getElementById( 'slideImageFile' );

		if ( uploadArea && imageFile ) {
			uploadArea.addEventListener( 'click', () => imageFile.click() );
			imageFile.addEventListener( 'change', ( e ) => {
				if ( e.target.files[0] ) this.handleImageUpload( e.target.files[0] );
			} );
		}

		// Модальные окна
		const closeModalBtn = document.getElementById( 'closePromoSlideModal' );
		const cancelBtn = document.getElementById( 'cancelPromoSlideBtn' );
		const saveBtn = document.getElementById( 'savePromoSlideBtn' );

		if ( closeModalBtn ) closeModalBtn.addEventListener( 'click', () => this.closeModal() );
		if ( cancelBtn ) cancelBtn.addEventListener( 'click', () => this.closeModal() );
		if ( saveBtn ) saveBtn.addEventListener( 'click', () => this.saveSlide() );

		const closeDeleteModalBtn = document.getElementById( 'closeDeletePromoSlideModal' );
		const cancelDeleteBtn = document.getElementById( 'cancelDeletePromoSlideBtn' );
		const confirmDeleteBtn = document.getElementById( 'confirmDeletePromoSlideBtn' );

		if ( closeDeleteModalBtn ) closeDeleteModalBtn.addEventListener( 'click', () => this.closeDeleteModal() );
		if ( cancelDeleteBtn ) cancelDeleteBtn.addEventListener( 'click', () => this.closeDeleteModal() );
		if ( confirmDeleteBtn ) confirmDeleteBtn.addEventListener( 'click', () => this.confirmDelete() );

		// Закрытие по клику вне модалки
		window.addEventListener( 'click', ( e ) => {
			const modal = document.getElementById( 'promoSlideModal' );
			if ( e.target === modal ) this.closeModal();

			const deleteModal = document.getElementById( 'deletePromoSlideModal' );
			if ( e.target === deleteModal ) this.closeDeleteModal();
		} );
	}

	escapeHtml( str ) {
		if ( !str ) return '';
		return str
			.replace( /&/g, '&amp;' )
			.replace( /</g, '&lt;' )
			.replace( />/g, '&gt;' )
			.replace( /"/g, '&quot;' )
			.replace( /'/g, '&#39;' );
	}

	// =========================================================================
	// ИНИЦИАЛИЗАЦИЯ ДЛЯ ФРОНТЕНДА (ГЛАВНАЯ СТРАНИЦА)
	// =========================================================================

	initFrontend() {
		console.log( '🏠 Режим отображения промо-слайдов' );

		// Очищаем существующий контейнер от статических слайдов
		this.clearExistingSlides();

		// Загружаем и отображаем слайды
		this.loadAndRenderFrontendSlides();

		// Инициализируем аккордеон после рендера слайдов
		// Используем setTimeout чтобы убедиться, что DOM обновился
		setTimeout( () => {
			this.initAccordion();
		}, 50 );

		// Слушаем обновление слайдов из админки
		window.addEventListener( 'promoslides:updated', () => {
			console.log( '🔄 Слайды обновлены, перезагружаем...' );
			this.clearExistingSlides();
			this.loadAndRenderFrontendSlides();
			// Переинициализируем аккордеон после обновления
			setTimeout( () => {
				this.initAccordion();
			}, 50 );
		} );
	}

	/**
	 * Очищает существующие статические слайды из HTML
	 */
	clearExistingSlides() {
		const container = document.querySelector( '.accordion-logo__container' );
		if ( container ) {
			// Очищаем контейнер, но оставляем его пустым
			container.innerHTML = '';
		}
	}

	loadAndRenderFrontendSlides() {
		const container = document.querySelector( '.accordion-logo__container' );
		if ( !container ) {
			console.warn( '⚠️ Контейнер .accordion-logo__container не найден' );
			return;
		}

		const saved = localStorage.getItem( 'komori_promo_slides' );
		let slides = [];

		if ( saved ) {
			slides = JSON.parse( saved );
			slides = slides.filter( s => s.status === 'active' ).sort( ( a, b ) => a.order - b.order );
			console.log( `📊 Загружено ${slides.length} активных слайдов` );
		} else {
			console.log( '📊 Нет сохраненных слайдов, используются статические' );
			// Если нет сохраненных слайдов, ничего не делаем - возможно, есть статические
			return;
		}

		if ( slides.length > 0 ) {
			this.renderFrontendSlides( container, slides );
		} else {
			console.log( '⚠️ Нет активных слайдов для отображения' );
			container.innerHTML = '<div class="no-slides">Нет активных слайдов</div>';
		}
	}

	renderFrontendSlides( container, slides ) {
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

		console.log( `✅ Отрендерено ${slides.length} слайдов` );
		this.updateFrontendNavigationDots( slides.length );
	}

	updateFrontendNavigationDots( count ) {
		const navIndicators = document.querySelector( '.custom-navigation .nav-indicators' );
		if ( !navIndicators ) {
			console.warn( '⚠️ Контейнер .nav-indicators не найден' );
			return;
		}

		navIndicators.innerHTML = '';
		for ( let i = 0; i < count; i++ ) {
			const dot = document.createElement( 'div' );
			dot.className = 'nav-dot' + ( i === 0 ? ' active' : '' );
			dot.dataset.index = i;
			navIndicators.appendChild( dot );
		}
		console.log( `✅ Создано ${count} навигационных точек` );
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

		// Останавливаем предыдущий интервал если был
		if ( this.autoPlayInterval ) {
			clearInterval( this.autoPlayInterval );
		}

		let currentIndex = 0;
		let isUserInteracting = false;
		let scrollAnimationFrame;

		const updateActiveNav = () => {
			if ( scrollAnimationFrame ) cancelAnimationFrame( scrollAnimationFrame );

			scrollAnimationFrame = requestAnimationFrame( () => {
				const scrollLeft = container.scrollLeft;
				const itemWidth = container.clientWidth;
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
			let nextIndex = currentIndex + 1;
			if ( nextIndex >= totalItems ) nextIndex = 0;

			container.scrollTo( {
				left: itemWidth * nextIndex,
				behavior: 'smooth'
			} );
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

		// Удаляем старые обработчики, чтобы не было дублирования
		container.removeEventListener( 'scroll', updateActiveNav );
		container.removeEventListener( 'scrollend', updateActiveNav );
		container.removeEventListener( 'touchstart', stopAutoPlay );
		container.removeEventListener( 'touchend', () => { } );

		// Добавляем новые обработчики
		container.addEventListener( 'scroll', updateActiveNav );

		navDots.forEach( ( dot, index ) => {
			dot.removeEventListener( 'click', () => { } );
			dot.addEventListener( 'click', () => {
				const itemWidth = container.clientWidth;
				container.scrollTo( { left: itemWidth * index, behavior: 'smooth' } );
				pauseAutoPlay( 2000 );
			} );
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

		// Запускаем аккордеон
		updateActiveNav();
		startAutoPlay();

		this.accordionInitialized = true;
		console.log( '✅ Аккордеон успешно инициализирован' );
	}
}

// ============================================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================================

// Проверяем, загружен ли уже DOM
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', () => {
		window.promoSlidesManager = new PromoSlidesManager();
		console.log( '✅ Модуль промо-слайдов инициализирован (DOMContentLoaded)' );
	} );
} else {
	// DOM уже загружен, инициализируем immediately
	window.promoSlidesManager = new PromoSlidesManager();
	console.log( '✅ Модуль промо-слайдов инициализирован (immediate)' );
}

// Дополнительная страховка - если что-то пошло не так, инициализируем через небольшую задержку
setTimeout( () => {
	if ( !window.promoSlidesManager || !window.promoSlidesManager.accordionInitialized ) {
		if ( !document.getElementById( 'promoSlidesList' ) ) {
			console.log( '🔄 Повторная инициализация промо-слайдов (fallback)' );
			window.promoSlidesManager = new PromoSlidesManager();
		}
	}
}, 500 );