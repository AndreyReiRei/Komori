/**
 * Скрипт для чата с поддержкой и обратной связью
 * Современный интерфейс с адаптацией под мобильные устройства
 */

document.addEventListener( 'DOMContentLoaded', function () {
	// ===== ЭЛЕМЕНТЫ ИНТЕРФЕЙСА =====
	const chatBtn = document.getElementById( 'chatBtn' ); // Десктопная кнопка
	const mobileChatBtn = document.getElementById( 'mobileChatBtn' ); // Мобильная иконка
	const chatModal = document.getElementById( 'chatModal' );
	const closeChat = document.getElementById( 'closeChat' );
	const minimizeChat = document.getElementById( 'minimizeChat' );
	const chatMessages = document.getElementById( 'chatMessages' );
	const chatInput = document.getElementById( 'chatInput' );
	const sendBtn = document.getElementById( 'sendMessage' );
	const quickCallback = document.getElementById( 'quickCallback' );
	const quickQuestion = document.getElementById( 'quickQuestion' );
	const callbackForm = document.getElementById( 'callbackForm' );
	const cancelCallback = document.getElementById( 'cancelCallback' );
	const contactForm = document.getElementById( 'contactForm' );
	const chatUnreadBadge = document.getElementById( 'chatUnreadCount' );

	// ===== СОСТОЯНИЕ ЧАТА =====
	let isChatMinimized = false;
	let messageCount = 0;
	let unreadMessages = 0;
	let isChatOpen = false;

	// ===== ФУНКЦИИ УПРАВЛЕНИЯ МОДАЛЬНЫМ ОКНОМ =====

	/**
	 * Открытие чата
	 */
	function openChat() {
		if ( chatModal ) {
			chatModal.style.display = 'block';
			isChatOpen = true;

			// Сбрасываем счетчик непрочитанных сообщений
			unreadMessages = 0;
			updateUnreadBadge();

			// Фокусируемся на поле ввода
			setTimeout( () => {
				if ( chatInput ) chatInput.focus();
			}, 300 );

			// Добавляем приветственное сообщение при первом открытии
			if ( messageCount === 0 ) {
				addBotMessage( 'Здравствуйте! Я бот-помощник. Чем могу помочь? Вы можете задать вопрос или заказать обратный звонок.' );
				messageCount++;
			}

			// Блокируем скролл body
			document.body.style.overflow = 'hidden';
		}
	}

	/**
	 * Закрытие чата
	 */
	function closeChatFunc() {
		if ( chatModal ) {
			chatModal.style.display = 'none';
			isChatOpen = false;

			// Скрываем форму обратной связи при закрытии
			if ( callbackForm ) {
				callbackForm.style.display = 'none';
			}

			// Возвращаем скролл body
			document.body.style.overflow = '';

			// Если были новые сообщения, показываем бейдж
			if ( unreadMessages > 0 ) {
				updateUnreadBadge();
			}
		}
	}

	/**
	 * Сворачивание/разворачивание чата
	 */
	function toggleMinimize() {
		if ( !chatModal ) return;

		const modalContent = chatModal.querySelector( '.modal-content' );
		if ( modalContent ) {
			if ( isChatMinimized ) {
				// Разворачиваем
				modalContent.style.height = '80vh';
				modalContent.style.maxHeight = '700px';
				minimizeChat.innerHTML = '<i class="fas fa-minus"></i>';
				minimizeChat.title = 'Свернуть';
			} else {
				// Сворачиваем
				modalContent.style.height = 'auto';
				modalContent.style.maxHeight = '80px';
				minimizeChat.innerHTML = '<i class="fas fa-plus"></i>';
				minimizeChat.title = 'Развернуть';
			}
			isChatMinimized = !isChatMinimized;
		}
	}

	/**
	 * Обновление счетчика непрочитанных сообщений
	 */
	function updateUnreadBadge() {
		if ( chatUnreadBadge ) {
			if ( unreadMessages > 0 && !isChatOpen ) {
				chatUnreadBadge.style.display = 'flex';
				chatUnreadBadge.textContent = unreadMessages > 9 ? '9+' : unreadMessages;
			} else {
				chatUnreadBadge.style.display = 'none';
			}
		}
	}

	// ===== ФУНКЦИИ ДЛЯ РАБОТЫ С СООБЩЕНИЯМИ =====

	/**
	 * Добавление сообщения в чат
	 * @param {string} text - Текст сообщения
	 * @param {string} type - Тип сообщения ('user' или 'bot')
	 */
	function addMessage( text, type = 'user' ) {
		if ( !chatMessages || !text.trim() ) return;

		const messageDiv = document.createElement( 'div' );
		messageDiv.className = `message ${type}-message`;

		const time = new Date().toLocaleTimeString( 'ru-RU', {
			hour: '2-digit',
			minute: '2-digit'
		} );

		if ( type === 'user' ) {
			messageDiv.innerHTML = `
                <div class="message-content-wrapper">
                    <div class="message-text">${escapeHtml( text )}</div>
                    <div class="message-time">${time}</div>
                </div>
                <div class="message-avatar">
                    <i class="fas fa-user"></i>
                </div>
            `;
		} else {
			messageDiv.innerHTML = `
                <div class="message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content-wrapper">
                    <div class="message-sender">Бот поддержки</div>
                    <div class="message-text">${escapeHtml( text )}</div>
                    <div class="message-time">${time}</div>
                </div>
            `;

			// Увеличиваем счетчик непрочитанных, если чат закрыт
			if ( !isChatOpen ) {
				unreadMessages++;
				updateUnreadBadge();
			}
		}

		chatMessages.appendChild( messageDiv );
		// Прокрутка к новому сообщению
		chatMessages.scrollTop = chatMessages.scrollHeight;
	}

	/**
	 * Добавление сообщения от бота
	 * @param {string} text - Текст сообщения
	 */
	function addBotMessage( text ) {
		addMessage( text, 'bot' );
	}

	/**
	 * Защита от XSS
	 * @param {string} unsafe - Небезопасная строка
	 * @returns {string} - Безопасная строка
	 */
	function escapeHtml( unsafe ) {
		return unsafe
			.replace( /&/g, "&amp;" )
			.replace( /</g, "&lt;" )
			.replace( />/g, "&gt;" )
			.replace( /"/g, "&quot;" )
			.replace( /'/g, "&#039;" );
	}

	/**
	 * Отправка сообщения
	 */
	function sendMessage() {
		const message = chatInput.value.trim();
		if ( !message ) return;

		// Добавляем сообщение пользователя
		addMessage( message, 'user' );

		// Очищаем поле ввода
		chatInput.value = '';

		// Имитация ответа бота
		setTimeout( () => {
			const botResponses = [
				'Спасибо за сообщение! Оператор скоро ответит вам.',
				'Извините за ожидание. Чем еще могу помочь?',
				'Если у вас срочный вопрос, можете заказать обратный звонок.',
				'Я передал ваше сообщение оператору.'
			];
			const randomResponse = botResponses[Math.floor( Math.random() * botResponses.length )];
			addBotMessage( randomResponse );
		}, 1000 );
	}

	// ===== ФУНКЦИИ ДЛЯ ФОРМЫ ОБРАТНОЙ СВЯЗИ =====

	/**
	 * Показать форму обратного звонка
	 */
	function showCallbackForm() {
		if ( callbackForm ) {
			callbackForm.style.display = 'block';
			// Добавляем сообщение от бота
			addBotMessage( 'Пожалуйста, заполните форму для обратного звонка. Мы свяжемся с вами в ближайшее время.' );
			// Фокусируемся на первом поле
			setTimeout( () => {
				const firstInput = document.getElementById( 'nameInput' );
				if ( firstInput ) firstInput.focus();
			}, 300 );
		}
	}

	/**
	 * Скрыть форму обратной связи
	 */
	function hideCallbackForm() {
		if ( callbackForm ) {
			callbackForm.style.display = 'none';
			// Сбрасываем форму
			if ( contactForm ) contactForm.reset();
		}
	}

	// ===== ОБРАБОТЧИКИ СОБЫТИЙ =====

	// Открытие чата (десктопная кнопка)
	if ( chatBtn ) {
		chatBtn.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			openChat();
		} );
	}

	// Открытие чата (мобильная иконка)
	if ( mobileChatBtn ) {
		mobileChatBtn.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			openChat();
		} );
	}

	// Закрытие чата
	if ( closeChat ) {
		closeChat.addEventListener( 'click', closeChatFunc );
	}

	// Сворачивание чата
	if ( minimizeChat ) {
		minimizeChat.addEventListener( 'click', toggleMinimize );
	}

	// Отправка сообщения по кнопке
	if ( sendBtn ) {
		sendBtn.addEventListener( 'click', sendMessage );
	}

	// Отправка сообщения по Enter
	if ( chatInput ) {
		chatInput.addEventListener( 'keypress', function ( e ) {
			if ( e.key === 'Enter' && !e.shiftKey ) {
				e.preventDefault();
				sendMessage();
			}
		} );
	}

	// Быстрые действия - заказ звонка
	if ( quickCallback ) {
		quickCallback.addEventListener( 'click', function () {
			showCallbackForm();
		} );
	}

	// Быстрые действия - частые вопросы
	if ( quickQuestion ) {
		quickQuestion.addEventListener( 'click', function () {
			addBotMessage( 'Часто задаваемые вопросы:\n1. Как оформить заказ?\n2. Способы доставки\n3. Оплата\n4. Возврат товара\n\nНапишите номер вопроса для подробностей.' );
		} );
	}

	// Отмена в форме обратной связи
	if ( cancelCallback ) {
		cancelCallback.addEventListener( 'click', function () {
			hideCallbackForm();
			addBotMessage( 'Хорошо, если захотите заказать звонок - нажмите кнопку "Заказать звонок"' );
		} );
	}

	// Отправка формы обратной связи
	if ( contactForm ) {
		contactForm.addEventListener( 'submit', function ( e ) {
			e.preventDefault();

			const name = document.getElementById( 'nameInput' ).value.trim();
			const phone = document.getElementById( 'phoneInput' ).value.trim();
			const message = document.getElementById( 'messageInput' ).value.trim();

			// Валидация
			if ( !name || !phone ) {
				alert( 'Пожалуйста, заполните обязательные поля' );
				return;
			}

			// Простая проверка телефона
			const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
			if ( !phoneRegex.test( phone ) ) {
				alert( 'Пожалуйста, введите корректный номер телефона' );
				return;
			}

			// Отправка данных (имитация)
			console.log( 'Заявка на звонок:', { name, phone, message, timestamp: new Date().toISOString() } );

			// Сообщение об успехе
			addBotMessage( `Спасибо, ${name}! Мы получили вашу заявку и свяжемся с вами по номеру ${phone} в ближайшее время.` );

			// Скрываем и сбрасываем форму
			hideCallbackForm();

			// Дополнительное уведомление
			setTimeout( () => {
				addBotMessage( 'Если у вас есть другие вопросы, просто напишите их в чат.' );
			}, 2000 );
		} );
	}

	// Маска для телефона
	const phoneInput = document.getElementById( 'phoneInput' );
	if ( phoneInput ) {
		phoneInput.addEventListener( 'input', function ( e ) {
			let value = this.value.replace( /\D/g, '' );

			// Простая маска: +7 (XXX) XXX-XX-XX
			if ( value.length > 0 ) {
				if ( value[0] === '7' || value[0] === '8' ) {
					value = value.substring( 1 );
				}

				let formatted = '+7 (';
				if ( value.length > 0 ) formatted += value.substring( 0, 3 );
				if ( value.length > 3 ) formatted += ') ' + value.substring( 3, 6 );
				if ( value.length > 6 ) formatted += '-' + value.substring( 6, 8 );
				if ( value.length > 8 ) formatted += '-' + value.substring( 8, 10 );

				this.value = formatted;
			}
		} );
	}

	// Закрытие при клике вне модального окна
	window.addEventListener( 'click', function ( e ) {
		if ( chatModal && e.target === chatModal ) {
			closeChatFunc();
		}
	} );

	// Закрытие по Escape
	document.addEventListener( 'keydown', function ( e ) {
		if ( e.key === 'Escape' && chatModal && chatModal.style.display === 'block' ) {
			closeChatFunc();
		}
	} );

	// Обработка свайпа вниз для закрытия на мобильных
	let touchStartY = 0;
	let touchEndY = 0;

	if ( chatModal ) {
		chatModal.addEventListener( 'touchstart', function ( e ) {
			touchStartY = e.touches[0].clientY;
		}, { passive: true } );

		chatModal.addEventListener( 'touchmove', function ( e ) {
			touchEndY = e.touches[0].clientY;
		}, { passive: true } );

		chatModal.addEventListener( 'touchend', function ( e ) {
			if ( touchEndY - touchStartY > 100 && window.innerWidth <= 768 ) {
				// Свайп вниз на мобильном устройстве
				closeChatFunc();
			}
		} );
	}

	console.log( 'Чат с поддержкой загружен' );
} );