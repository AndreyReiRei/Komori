/**
 * Управление промокодами в админке
 */

class PromoCodesManager {
	constructor() {
		this.promoCodes = [];
		this.currentPage = 1;
		this.itemsPerPage = 10;
		this.currentEditId = null;
		this.init();
	}

	init() {
		this.loadPromoCodes();
		this.renderPromoCodes();
		this.bindEvents();
	}

	loadPromoCodes() {
		const saved = localStorage.getItem( 'komori_promocodes' );
		if ( saved ) {
			this.promoCodes = JSON.parse( saved );
		} else {
			// Добавляем демо-промокоды
			this.promoCodes = [
				{
					id: Date.now() + 1,
					code: 'SAKURA10',
					type: 'percent',
					discount: 10,
					minOrder: 0,
					description: '10% скидка на первый заказ',
					validFrom: null,
					validUntil: null,
					maxUses: 0,
					usedCount: 0,
					isActive: true,
					createdAt: new Date().toISOString()
				},
				{
					id: Date.now() + 2,
					code: 'KOMORI500',
					type: 'fixed',
					discount: 500,
					minOrder: 3000,
					description: '500 ₽ скидка при заказе от 3000 ₽',
					validFrom: null,
					validUntil: null,
					maxUses: 0,
					usedCount: 0,
					isActive: true,
					createdAt: new Date().toISOString()
				},
				{
					id: Date.now() + 3,
					code: 'WELCOME',
					type: 'percent',
					discount: 15,
					minOrder: 0,
					description: '15% скидка для новых пользователей',
					validFrom: null,
					validUntil: null,
					maxUses: 100,
					usedCount: 45,
					isActive: true,
					createdAt: new Date().toISOString()
				}
			];
			this.savePromoCodes();
		}
	}

	savePromoCodes() {
		localStorage.setItem( 'komori_promocodes', JSON.stringify( this.promoCodes ) );
		// Отправляем событие об обновлении промокодов
		window.dispatchEvent( new CustomEvent( 'promocodes:updated', { detail: this.promoCodes } ) );
	}

	getFilteredPromoCodes() {
		const search = document.getElementById( 'promoCodeSearch' )?.value.toLowerCase() || '';
		const typeFilter = document.getElementById( 'promoCodeTypeFilter' )?.value || 'all';
		const statusFilter = document.getElementById( 'promoCodeStatusFilter' )?.value || 'all';

		return this.promoCodes.filter( promo => {
			// Поиск по коду
			if ( search && !promo.code.toLowerCase().includes( search ) ) return false;

			// Фильтр по типу
			if ( typeFilter !== 'all' && promo.type !== typeFilter ) return false;

			// Фильтр по статусу
			if ( statusFilter !== 'all' ) {
				const now = new Date();
				const isValid = this.isPromoCodeValid( promo );

				if ( statusFilter === 'active' && ( !promo.isActive || !isValid ) ) return false;
				if ( statusFilter === 'expired' && ( !promo.validUntil || new Date( promo.validUntil ) > now ) ) return false;
				if ( statusFilter === 'disabled' && promo.isActive ) return false;
			}

			return true;
		} );
	}

	isPromoCodeValid( promo ) {
		if ( !promo.isActive ) return false;

		const now = new Date();

		// Проверка даты начала
		if ( promo.validFrom && new Date( promo.validFrom ) > now ) return false;

		// Проверка даты окончания
		if ( promo.validUntil && new Date( promo.validUntil ) < now ) return false;

		// Проверка количества использований
		if ( promo.maxUses > 0 && promo.usedCount >= promo.maxUses ) return false;

		return true;
	}

	renderPromoCodes() {
		const tbody = document.getElementById( 'promoCodesList' );
		if ( !tbody ) return;

		const filtered = this.getFilteredPromoCodes();
		const totalPages = Math.ceil( filtered.length / this.itemsPerPage );
		const start = ( this.currentPage - 1 ) * this.itemsPerPage;
		const paginated = filtered.slice( start, start + this.itemsPerPage );

		if ( paginated.length === 0 ) {
			tbody.innerHTML = '<tr class="empty-row"><td colspan="8">Нет промокодов</td></tr>';
			this.updatePagination( totalPages );
			return;
		}

		tbody.innerHTML = paginated.map( promo => this.renderPromoCodeRow( promo ) ).join( '' );
		this.updatePagination( totalPages );
	}

	renderPromoCodeRow( promo ) {
		const isValid = this.isPromoCodeValid( promo );
		const status = !promo.isActive ? 'disabled' : ( isValid ? 'active' : 'expired' );
		const statusText = {
			'active': 'Активен',
			'expired': 'Просрочен',
			'disabled': 'Отключен'
		}[status];

		const discountText = promo.type === 'percent' ? `${promo.discount}%` : `${promo.discount.toLocaleString()} ₽`;
		const typeText = promo.type === 'percent' ? 'Процентная' : 'Фиксированная';

		const validUntilText = promo.validUntil
			? new Date( promo.validUntil ).toLocaleDateString( 'ru-RU' )
			: 'Без ограничений';

		const maxUsesText = promo.maxUses > 0 ? `${promo.usedCount}/${promo.maxUses}` : '∞';

		return `
            <tr data-id="${promo.id}">
                <td><strong>${promo.code}</strong></td>
                <td><span class="type-badge ${promo.type}">${typeText}</span></td>
                <td>${discountText}</td>
                <td>${promo.description || '-'}</td>
                <td>${validUntilText}</td>
                <td><span class="status-badge ${status}">${statusText}</span></td>
                <td>${maxUsesText}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit-promo" data-id="${promo.id}" title="Редактировать">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-promo" data-id="${promo.id}" title="Удалить">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
	}

	updatePagination( totalPages ) {
		const currentPageSpan = document.getElementById( 'currentPage' );
		const totalPagesSpan = document.getElementById( 'totalPages' );
		const prevBtn = document.querySelector( '#promoCodesPagination .pagination-btn.prev' );
		const nextBtn = document.querySelector( '#promoCodesPagination .pagination-btn.next' );

		if ( currentPageSpan ) currentPageSpan.textContent = this.currentPage;
		if ( totalPagesSpan ) totalPagesSpan.textContent = totalPages;

		if ( prevBtn ) prevBtn.disabled = this.currentPage === 1;
		if ( nextBtn ) nextBtn.disabled = this.currentPage === totalPages;
	}

	changePage( direction ) {
		const filtered = this.getFilteredPromoCodes();
		const totalPages = Math.ceil( filtered.length / this.itemsPerPage );

		if ( direction === 'prev' && this.currentPage > 1 ) {
			this.currentPage--;
		} else if ( direction === 'next' && this.currentPage < totalPages ) {
			this.currentPage++;
		}

		this.renderPromoCodes();
	}

	openModal( promoId = null ) {
		const modal = document.getElementById( 'promoCodeModal' );
		const title = document.getElementById( 'promoCodeModalTitle' );
		const form = document.getElementById( 'promoCodeForm' );

		if ( !modal ) return;

		form?.reset();
		this.currentEditId = promoId;

		// Сбрасываем hint для типа скидки
		const typeSelect = document.getElementById( 'promoCodeType' );
		const discountHint = document.getElementById( 'discountHint' );
		if ( typeSelect && discountHint ) {
			discountHint.textContent = typeSelect.value === 'percent' ? '% от суммы заказа' : '₽ от суммы заказа';
		}

		if ( promoId ) {
			const promo = this.promoCodes.find( p => p.id == promoId );
			if ( promo ) {
				title.textContent = 'Редактировать промокод';
				this.fillForm( promo );
			}
		} else {
			title.textContent = 'Добавить промокод';
		}

		modal.classList.add( 'show' );
	}

	fillForm( promo ) {
		document.getElementById( 'promoCodeCode' ).value = promo.code;
		document.getElementById( 'promoCodeType' ).value = promo.type;
		document.getElementById( 'promoCodeDiscount' ).value = promo.discount;
		document.getElementById( 'promoCodeMinOrder' ).value = promo.minOrder || 0;
		document.getElementById( 'promoCodeDescription' ).value = promo.description || '';
		document.getElementById( 'promoCodeValidFrom' ).value = promo.validFrom || '';
		document.getElementById( 'promoCodeValidUntil' ).value = promo.validUntil || '';
		document.getElementById( 'promoCodeMaxUses' ).value = promo.maxUses || 0;
		document.getElementById( 'promoCodeIsActive' ).checked = promo.isActive;
	}

	savePromoCode() {
		const code = document.getElementById( 'promoCodeCode' ).value.trim().toUpperCase();
		const type = document.getElementById( 'promoCodeType' ).value;
		const discount = parseFloat( document.getElementById( 'promoCodeDiscount' ).value );
		const minOrder = parseFloat( document.getElementById( 'promoCodeMinOrder' ).value ) || 0;
		const description = document.getElementById( 'promoCodeDescription' ).value.trim();
		const validFrom = document.getElementById( 'promoCodeValidFrom' ).value || null;
		const validUntil = document.getElementById( 'promoCodeValidUntil' ).value || null;
		const maxUses = parseInt( document.getElementById( 'promoCodeMaxUses' ).value ) || 0;
		const isActive = document.getElementById( 'promoCodeIsActive' ).checked;

		// Валидация
		if ( !code ) {
			API.showNotification( 'Введите код промокода', 'error' );
			return;
		}

		if ( !/^[A-Z0-9]+$/.test( code ) ) {
			API.showNotification( 'Код может содержать только латинские буквы и цифры', 'error' );
			return;
		}

		if ( discount <= 0 ) {
			API.showNotification( 'Введите корректную скидку', 'error' );
			return;
		}

		if ( type === 'percent' && discount > 100 ) {
			API.showNotification( 'Процентная скидка не может превышать 100%', 'error' );
			return;
		}

		// Проверка на уникальность кода (при создании нового)
		if ( !this.currentEditId ) {
			const existing = this.promoCodes.find( p => p.code === code );
			if ( existing ) {
				API.showNotification( 'Промокод с таким кодом уже существует', 'error' );
				return;
			}
		}

		if ( this.currentEditId ) {
			// Обновляем существующий
			const index = this.promoCodes.findIndex( p => p.id == this.currentEditId );
			if ( index !== -1 ) {
				this.promoCodes[index] = {
					...this.promoCodes[index],
					code,
					type,
					discount,
					minOrder,
					description,
					validFrom,
					validUntil,
					maxUses,
					isActive
				};
				API.showNotification( 'Промокод обновлен', 'success' );
			}
		} else {
			// Создаем новый
			const newPromo = {
				id: Date.now(),
				code,
				type,
				discount,
				minOrder,
				description,
				validFrom,
				validUntil,
				maxUses,
				usedCount: 0,
				isActive,
				createdAt: new Date().toISOString()
			};
			this.promoCodes.push( newPromo );
			API.showNotification( 'Промокод добавлен', 'success' );
		}

		this.savePromoCodes();
		this.renderPromoCodes();
		this.closeModal();
	}

	deletePromoCode( id ) {
		const promo = this.promoCodes.find( p => p.id == id );
		if ( !promo ) return;

		document.getElementById( 'deletePromoCodeName' ).textContent = promo.code;
		this.currentEditId = id;

		const modal = document.getElementById( 'deletePromoCodeModal' );
		if ( modal ) modal.classList.add( 'show' );
	}

	confirmDelete() {
		if ( this.currentEditId ) {
			this.promoCodes = this.promoCodes.filter( p => p.id != this.currentEditId );
			this.savePromoCodes();
			this.renderPromoCodes();
			API.showNotification( 'Промокод удален', 'success' );
			this.closeDeleteModal();
		}
	}

	closeModal() {
		const modal = document.getElementById( 'promoCodeModal' );
		if ( modal ) modal.classList.remove( 'show' );
		this.currentEditId = null;
	}

	closeDeleteModal() {
		const modal = document.getElementById( 'deletePromoCodeModal' );
		if ( modal ) modal.classList.remove( 'show' );
		this.currentEditId = null;
	}

	bindEvents() {
		// Кнопка добавления
		const addBtn = document.getElementById( 'addPromoCodeBtn' );
		if ( addBtn ) {
			addBtn.addEventListener( 'click', () => this.openModal() );
		}

		// Поиск и фильтры
		const searchInput = document.getElementById( 'promoCodeSearch' );
		const typeFilter = document.getElementById( 'promoCodeTypeFilter' );
		const statusFilter = document.getElementById( 'promoCodeStatusFilter' );

		if ( searchInput ) {
			searchInput.addEventListener( 'input', () => {
				this.currentPage = 1;
				this.renderPromoCodes();
			} );
		}

		if ( typeFilter ) {
			typeFilter.addEventListener( 'change', () => {
				this.currentPage = 1;
				this.renderPromoCodes();
			} );
		}

		if ( statusFilter ) {
			statusFilter.addEventListener( 'change', () => {
				this.currentPage = 1;
				this.renderPromoCodes();
			} );
		}

		// Тип скидки - меняем подсказку
		const typeSelect = document.getElementById( 'promoCodeType' );
		const discountHint = document.getElementById( 'discountHint' );
		if ( typeSelect && discountHint ) {
			typeSelect.addEventListener( 'change', () => {
				discountHint.textContent = typeSelect.value === 'percent' ? '% от суммы заказа' : '₽ от суммы заказа';
			} );
		}

		// Редактирование/удаление через делегирование
		document.addEventListener( 'click', ( e ) => {
			const editBtn = e.target.closest( '.edit-promo' );
			if ( editBtn ) {
				const id = editBtn.dataset.id;
				this.openModal( id );
			}

			const deleteBtn = e.target.closest( '.delete-promo' );
			if ( deleteBtn ) {
				const id = deleteBtn.dataset.id;
				this.deletePromoCode( id );
			}
		} );

		// Пагинация
		const prevBtn = document.querySelector( '#promoCodesPagination .pagination-btn.prev' );
		const nextBtn = document.querySelector( '#promoCodesPagination .pagination-btn.next' );

		if ( prevBtn ) {
			prevBtn.addEventListener( 'click', () => this.changePage( 'prev' ) );
		}
		if ( nextBtn ) {
			nextBtn.addEventListener( 'click', () => this.changePage( 'next' ) );
		}

		// Модальные окна
		const closeModalBtn = document.getElementById( 'closePromoCodeModal' );
		const cancelBtn = document.getElementById( 'cancelPromoCodeBtn' );
		const saveBtn = document.getElementById( 'savePromoCodeBtn' );

		if ( closeModalBtn ) closeModalBtn.addEventListener( 'click', () => this.closeModal() );
		if ( cancelBtn ) cancelBtn.addEventListener( 'click', () => this.closeModal() );
		if ( saveBtn ) saveBtn.addEventListener( 'click', () => this.savePromoCode() );

		const closeDeleteModalBtn = document.getElementById( 'closeDeletePromoCodeModal' );
		const cancelDeleteBtn = document.getElementById( 'cancelDeletePromoCodeBtn' );
		const confirmDeleteBtn = document.getElementById( 'confirmDeletePromoCodeBtn' );

		if ( closeDeleteModalBtn ) closeDeleteModalBtn.addEventListener( 'click', () => this.closeDeleteModal() );
		if ( cancelDeleteBtn ) cancelDeleteBtn.addEventListener( 'click', () => this.closeDeleteModal() );
		if ( confirmDeleteBtn ) confirmDeleteBtn.addEventListener( 'click', () => this.confirmDelete() );

		// Закрытие по клику вне модалки
		window.addEventListener( 'click', ( e ) => {
			const modal = document.getElementById( 'promoCodeModal' );
			if ( e.target === modal ) this.closeModal();

			const deleteModal = document.getElementById( 'deletePromoCodeModal' );
			if ( e.target === deleteModal ) this.closeDeleteModal();
		} );
	}
}

// Инициализация
document.addEventListener( 'DOMContentLoaded', () => {
	if ( document.getElementById( 'promoCodesList' ) ) {
		window.promoCodesManager = new PromoCodesManager();
		console.log( '✅ Модуль управления промокодами инициализирован' );
	}
} );