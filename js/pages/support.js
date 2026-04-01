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
	let unreadMessages = 0;
	let isChatOpen = false;
	let isWelcomeMessageSent = false; // Флаг для отслеживания приветственного сообщения

	// ===== БАЗА ЗНАНИЙ БОТА =====
	const knowledgeBase = {
		// Часто задаваемые вопросы
		faq: {
			'1': {
				question: 'Как оформить заказ?',
				answer: '📦 Как оформить заказ:\n\n1. Выберите товар в каталоге\n2. Нажмите кнопку "В корзину"\n3. Перейдите в корзину (иконка корзины вверху)\n4. Нажмите "Оформить заказ"\n5. Заполните данные для доставки\n6. Выберите способ оплаты\n7. Подтвердите заказ\n\n✅ После оформления вы получите подтверждение на email.'
			},
			'2': {
				question: 'Способы доставки',
				answer: '🚚 Способы доставки:\n\n• Курьерская доставка по городу - 300-500₽ (1-2 дня)\n• Почта России - от 250₽ (3-10 дней)\n• СДЭК - от 350₽ (2-5 дней)\n• Самовывоз из магазина - бесплатно\n\n📍 Адрес самовывоза: г. Москва, ул. Примерная, д. 123\n⏰ Время работы: Пн-Пт 10:00-20:00, Сб-Вс 11:00-18:00'
			},
			'3': {
				question: 'Способы оплаты',
				answer: '💳 Способы оплаты:\n\n• Банковские карты (Visa, MasterCard, МИР)\n• Наличные при получении\n• СБП (Система быстрых платежей)\n• Apple Pay / Google Pay\n• Оплата на сайте через ЮKassa\n\n🔒 Все платежи защищены и безопасны.'
			},
			'4': {
				question: 'Возврат товара',
				answer: '🔄 Возврат товара:\n\n• Товар можно вернуть в течение 14 дней\n• Товар должен быть в оригинальной упаковке\n• Сохранены все ярлыки и бирки\n• Возврат возможен при отсутствии следов использования\n\n📞 Для оформления возврата свяжитесь с нами по телефону +7 (800) 123-45-67 или напишите в чат.'
			},
			'5': {
				question: 'Есть ли скидки?',
				answer: '🎁 Наши акции и скидки:\n\n• При первом заказе - скидка 10%\n• При заказе от 3000₽ - бесплатная доставка\n• Накопительная система: 5% после 5 заказов\n• Сезонные распродажи (следите за новостями)\n• Специальные предложения в разделе "Акции и скидки"'
			},
			'6': {
				question: 'Как отследить заказ?',
				answer: '📍 Отслеживание заказа:\n\n1. Войдите в личный кабинет\n2. Перейдите в раздел "Мои заказы"\n3. Нажмите на номер заказа\n4. Вы увидите статус и трек-номер\n\n📧 Также мы отправляем уведомления на email при изменении статуса заказа.'
			},
			'7': {
				question: 'Как связаться с магазином?',
				answer: '📞 Контакты магазина:\n\n• Телефон: +7 (800) 123-45-67\n• Email: support@komori.ru\n• Telegram: @komori_support\n• Время работы: Пн-Пт 09:00-21:00, Сб-Вс 10:00-18:00\n\n💬 Также вы всегда можете написать нам в этот чат!'
			}
		},

		// Информация о магазине
		about: {
			hours: '⏰ Режим работы:\n• Понедельник-Пятница: 09:00 - 21:00\n• Суббота-Воскресенье: 10:00 - 18:00\n• Без перерыва',
			address: '📍 Наш адрес:\nг. Москва, ул. Примерная, д. 123\n(м. Примерная, выход №3, 5 минут пешком)',
			contacts: '📞 Контакты:\n• Телефон: +7 (800) 123-45-67\n• Email: info@komori.ru\n• Telegram: @komori_shop',
			promo: '🎁 Активные промокоды:\n• KOMORI10 - скидка 10% на первый заказ\n• FREESHIP - бесплатная доставка от 3000₽\n• WELCOME - подарок к первому заказу'
		}
	};

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

			// Добавляем приветственное сообщение только один раз
			if ( !isWelcomeMessageSent ) {
				addBotMessage( 'Здравствуйте! 👋 Я бот-помощник магазина "Комори".\n\nЧем могу помочь?\n\n📌 Быстрые команды:\n• "Вопросы" - список часто задаваемых вопросов\n• "Магазин" - информация о магазине\n• "Заказ" - проверить статус заказа\n• "Доставка" - способы доставки\n• "Оплата" - способы оплаты' );
				isWelcomeMessageSent = true;
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

		// Обрабатываем переносы строк
		const formattedText = text.replace( /\n/g, '<br>' );

		if ( type === 'user' ) {
			messageDiv.innerHTML = `
                <div class="message-content-wrapper">
                    <div class="message-text">${formattedText}</div>
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
                    <div class="message-text">${formattedText}</div>
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
		if ( !unsafe ) return '';
		return unsafe
			.replace( /&/g, "&amp;" )
			.replace( /</g, "&lt;" )
			.replace( />/g, "&gt;" )
			.replace( /"/g, "&quot;" )
			.replace( /'/g, "&#039;" );
	}

	/**
	 * Обработка сообщения пользователя и ответ бота
	 * @param {string} message - Сообщение пользователя
	 */
	function processUserMessage( message ) {
		const lowerMessage = message.toLowerCase().trim();

		// Проверяем, является ли сообщение номером вопроса
		const faqNumber = lowerMessage.match( /^(\d+)$/ );
		if ( faqNumber && knowledgeBase.faq[faqNumber[1]] ) {
			addBotMessage( knowledgeBase.faq[faqNumber[1]].answer );
			return;
		}

		// Проверяем ключевые слова
		if ( lowerMessage.includes( 'вопрос' ) || lowerMessage.includes( 'faq' ) || lowerMessage === '?' ) {
			let faqList = '📚 Часто задаваемые вопросы:\n\n';
			Object.keys( knowledgeBase.faq ).forEach( key => {
				faqList += `${key}. ${knowledgeBase.faq[key].question}\n`;
			} );
			faqList += '\nНапишите номер вопроса (например, "1") для получения подробного ответа.';
			addBotMessage( faqList );
			return;
		}

		if ( lowerMessage.includes( 'магазин' ) || lowerMessage.includes( 'о нас' ) ) {
			addBotMessage( '🏪 О магазине "Комори":\n\nМы - азиатский магазинчик у дома. У нас вы найдете:\n• Аниме фигурки\n• Японский чай\n• Азиатские сладости\n• Мангу и книги\n• Японскую посуду\n• Аниме одежду\n• И многое другое!\n\n' + knowledgeBase.about.hours + '\n\n' + knowledgeBase.about.address );
			return;
		}

		if ( lowerMessage.includes( 'доставк' ) ) {
			addBotMessage( knowledgeBase.faq['2'].answer );
			return;
		}

		if ( lowerMessage.includes( 'оплат' ) ) {
			addBotMessage( knowledgeBase.faq['3'].answer );
			return;
		}

		if ( lowerMessage.includes( 'заказ' ) && ( lowerMessage.includes( 'статус' ) || lowerMessage.includes( 'где' ) ) ) {
			addBotMessage( '🔍 Для проверки статуса заказа:\n\n1. Войдите в личный кабинет\n2. Перейдите в "Мои заказы"\n3. Выберите нужный заказ\n\n📧 Если у вас нет доступа к личному кабинету, напишите номер заказа и мы поможем!' );
			return;
		}

		if ( lowerMessage.includes( 'скидк' ) || lowerMessage.includes( 'акци' ) ) {
			addBotMessage( knowledgeBase.faq['5'].answer + '\n\n' + knowledgeBase.about.promo );
			return;
		}

		if ( lowerMessage.includes( 'контакт' ) || lowerMessage.includes( 'связат' ) ) {
			addBotMessage( knowledgeBase.faq['7'].answer );
			return;
		}

		if ( lowerMessage.includes( 'адрес' ) || lowerMessage.includes( 'где' ) ) {
			addBotMessage( knowledgeBase.about.address );
			return;
		}

		if ( lowerMessage.includes( 'часы' ) || lowerMessage.includes( 'работает' ) ) {
			addBotMessage( knowledgeBase.about.hours );
			return;
		}

		if ( lowerMessage.includes( 'промокод' ) || lowerMessage.includes( 'купо' ) ) {
			addBotMessage( knowledgeBase.about.promo );
			return;
		}

		if ( lowerMessage.includes( 'спасибо' ) || lowerMessage.includes( 'благодар' ) ) {
			addBotMessage( 'Пожалуйста! 🙏 Рады помочь. Если у вас есть еще вопросы, задавайте!' );
			return;
		}

		if ( lowerMessage.includes( 'привет' ) || lowerMessage.includes( 'здравствуй' ) || lowerMessage === 'здравствуйте' ) {
			addBotMessage( 'Здравствуйте! 👋 Чем могу помочь? Напишите "Вопросы" для списка часто задаваемых вопросов.' );
			return;
		}

		// Стандартный ответ, если не распознано
		addBotMessage( 'Я вас понял. 😊\n\nЕсли у вас есть вопрос, напишите "Вопросы" для просмотра часто задаваемых вопросов.\n\nИли можете заказать обратный звонок - наши операторы свяжутся с вами в ближайшее время.' );
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

		// Показываем индикатор набора текста
		showTypingIndicator();

		// Обрабатываем сообщение и даем ответ
		setTimeout( () => {
			hideTypingIndicator();
			processUserMessage( message );
		}, 500 );
	}

	/**
	 * Показывает индикатор набора текста
	 */
	let typingIndicator = null;

	function showTypingIndicator() {
		if ( typingIndicator ) return;

		typingIndicator = document.createElement( 'div' );
		typingIndicator.className = 'message bot-message typing-indicator';
		typingIndicator.innerHTML = `
			<div class="message-avatar">
				<i class="fas fa-robot"></i>
			</div>
			<div class="message-content-wrapper">
				<div class="message-sender">Бот поддержки</div>
				<div class="message-text typing">
					<span></span>
					<span></span>
					<span></span>
				</div>
			</div>
		`;

		chatMessages.appendChild( typingIndicator );
		chatMessages.scrollTop = chatMessages.scrollHeight;
	}

	/**
	 * Скрывает индикатор набора текста
	 */
	function hideTypingIndicator() {
		if ( typingIndicator ) {
			typingIndicator.remove();
			typingIndicator = null;
		}
	}

	// ===== ФУНКЦИИ ДЛЯ ФОРМЫ ОБРАТНОЙ СВЯЗИ =====

	/**
	 * Показать форму обратного звонка
	 */
	function showCallbackForm() {
		if ( callbackForm ) {
			callbackForm.style.display = 'block';
			// Добавляем сообщение от бота
			addBotMessage( '📞 Пожалуйста, заполните форму для обратного звонка. Мы свяжемся с вами в ближайшее время.' );
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
			let faqList = '📚 Часто задаваемые вопросы:\n\n';
			Object.keys( knowledgeBase.faq ).forEach( key => {
				faqList += `${key}. ${knowledgeBase.faq[key].question}\n`;
			} );
			faqList += '\nНапишите номер вопроса (например, "1") для получения подробного ответа.';
			addBotMessage( faqList );
		} );
	}

	// Отмена в форме обратной связи
	if ( cancelCallback ) {
		cancelCallback.addEventListener( 'click', function () {
			hideCallbackForm();
			addBotMessage( 'Хорошо, если захотите заказать звонок - нажмите кнопку "Заказать звонок" 📞' );
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
			addBotMessage( `✅ Спасибо, ${name}! Мы получили вашу заявку и свяжемся с вами по номеру ${phone} в ближайшее время.\n\n⏰ Ожидайте звонка в течение 15 минут в рабочее время.` );

			// Скрываем и сбрасываем форму
			hideCallbackForm();

			// Дополнительное уведомление
			setTimeout( () => {
				addBotMessage( '💡 Если у вас есть другие вопросы, просто напишите их в чат. Или нажмите "Частые вопросы" для быстрого ответа.' );
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
				closeChatFunc();
			}
		} );
	}

	console.log( 'Чат с поддержкой загружен' );
} );