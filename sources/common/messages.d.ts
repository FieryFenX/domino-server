import { Knuckle } from './knuckle';

/**
 * Начало игры
 */
export type GameStartedMessage = {
	/** Тип сообщения */
	type: 'gameStarted';
};

/**
 * Данные о костяшках на руках
 */
export type StartInfoMessage = {
	/** Тип сообщения */
	type: 'startInfo';
	/** Максимальное значение дубля в руке, при наличии */
	maxDouble: number | null;
	/** Максимальная сумма пары значений в руке */
	maxSum: number;
}

/**
 * Игра прервана
 */
export type GameAbortedMessage = {
	/** Тип сообщения */
	type: 'gameAborted';
};

/**
 * Ход игрока
 */
export type PlayerRollMessage = {
	/** Тип сообщения */
	type: 'playerRoll';
	/** Костяшка, положенная игроком на стол */
	knuckle: Knuckle | null;
};

/**
 * Взять костяшку из базара
 */
export type TakeKnuckleMessage = {
	/** Тип сообщения */
	type: 'takeKnuckle';
}

/**
 * Выдать костяшку из базара
 */
export type GiveKnuckleMessage = {
	/** Тип сообщения */
	type: 'giveKnuckle';
	/** Костяшка, выданная из базара */
	knuckle: Knuckle | null;
}

/**
 * Игра завершена
 */
export type GameEndedMessage = {
	/** Тип сообщения */
	type: 'gameEnded';
}

/**
 * Данные игрока в конце игры
 */
export type ResultMessage = {
	/** Тип сообщения */
	type: 'result';
	/** Сумма значений на руке */
	valuesSum: number;
}

/**
 * Результат игры
 */
export type GameResultMessage = {
	/** Тип сообщения */
	type: 'gameResult';
	/** Победа? */
	win: boolean;
	/** Количество очков */
	points: number;
};

/**
 * Смена игрока
 */
export type ChangePlayerMessage = {
	/** Тип сообщения */
	type: 'changePlayer';
	/** Мой ход? */
	myTurn: boolean;
	knuckle: Knuckle | null;
};

/**
 * Повтор игры
 */
export type RepeatGame = {
	/** Тип сообщения */
	type: 'repeatGame';
};

/**
 * Некорректный запрос клиента
 */
export type IncorrectRequestMessage = {
	/** Тип сообщения */
	type: 'incorrectRequest';
	/** Сообщение об ошибке */
	message: string;
};

/**
 * Некорректный ответ сервера
 */
export type IncorrectResponseMessage = {
	/** Тип сообщения */
	type: 'incorrectResponse';
	/** Сообщение об ошибке */
	message: string;
};

/**
 * Сообщения от сервера к клиенту
 */
export type AnyServerMessage =
	| GameStartedMessage
	| GameAbortedMessage
	| GameEndedMessage
	| GameResultMessage
	| GiveKnuckleMessage
	| ChangePlayerMessage
	| IncorrectRequestMessage
	| IncorrectResponseMessage;

/** 
 * Сообщения от клиента к серверу
 */
export type AnyClientMessage =
	| StartInfoMessage
	| PlayerRollMessage
	| TakeKnuckleMessage
	| ResultMessage
	| RepeatGame
	| IncorrectRequestMessage
	| IncorrectResponseMessage;
