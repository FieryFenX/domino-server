import type { Knuckle } from '../../common/knuckle';

/**
 * Кнопка для завершения хода
 */
const endTurn = document.querySelector( ".button[name = 'end-turn']" ) as HTMLButtonElement;
/**
 * Кнопка для отмены хода
 */
const cancel = document.querySelector( ".button[name = 'cancel']" ) as HTMLButtonElement;
/**
 * Элемент для затемнения экрана
 */
const darkBG = document.querySelector( '.darkBG' )!;
/**
 * Рука игрока (содержит его костяшки)
 */
const hand = document.querySelector( '.hand' )!;
/**
 * Игровое поле
 */
const field = document.querySelector( '.field' )!;
/**
 * Кнопка для взятия костяшки из базара
 */
const bazaar = document.querySelector('.bazaar') as HTMLButtonElement;

if ( !endTurn || !cancel || !darkBG || !hand || !field || !bazaar )
{
	throw new Error( 'Can\'t find required elements on "game" screen' );
}

/**
 * Набор словесных описаний возможных значений на костяшках
 */
const numerals: string[] = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];

/**
 * Костяшка, выбранная пользователем для хода
 */
let selectedKnuckle: HTMLButtonElement | null = null;
/**
 * Базовые координаты поля, определяющие смещение области видимости
 */
let baseX: number = 0,
    baseY: number = 0;
/**
 * Координаты положенной на поле костяшки
 */
let x1: number | undefined = undefined,
    y1: number | undefined = undefined,
    x2: number | undefined = undefined,
	y2: number | undefined = undefined;

/**
 * Обработчик хода игрока
 */
type TurnHandler = ( knuckle: Knuckle | null ) => void;
/**
 * Отправитель запроса на взятие костяшки
 */
type KnuckleTaker = () => void;
/**
 * Финализатор игры
 */
type Finalizer = ( valuesSum: number ) => void;

/**
 * Обработчик хода игрока
 */
let turnHandler: TurnHandler;
/**
 * Отправитель запроса на взятие костяшки
 */
let knuckleTaker: KnuckleTaker;
/**
 * Финализатор игры
 */
let finalizer: Finalizer;

bazaar.addEventListener( 'click', takeKnuckle );
endTurn.addEventListener( 'click', onSubmit );
cancel.addEventListener( 'click', onCancel );
/**
 * Слушатель для перерисовки игрового поля при изменении размеров окна
 */
window.addEventListener("resize", () => {requestAnimationFrame(drawField)}, false);
/**
 * Слушатель для перемещения области видимости с помощью колесика мыши
 */
window.addEventListener("wheel", e => {
  if (Math.abs(e.deltaY) + Math.abs(e.deltaX) > 30) {
  if (!e.altKey && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
    e.deltaY < 0 ? baseY-- : baseY++;
  }
  else {
    if (e.altKey) e.deltaY < 0 ? baseX-- : baseX++;
    else e.deltaX < 0 ? baseX-- : baseX++;
  }
  drawField(); }
});
/**
 * Слушатель для перемещения области видимости с помощью стрелок на клавиатуре
 */
document.addEventListener("keydown", event => {
	event.preventDefault();
	event = event || window.event;
	switch(event.keyCode) {
		 case 37:
			 baseX++;
			 break;
		 case 38:
			 baseY++;
			 break;
		 case 39:
			 baseX--;
			 break;
		 case 40:
			 baseY--;
			 break;
	}
	drawField();
} );
/**
 * Возвращает пару: максимальное значение дубля и максимальную сумму значений на руке игрока
 */
function startInfo(): [ number | null, number ] {
	let maxDouble = -1;
	let maxSum = -1;
	for ( let HTMLknuckle of hand.querySelectorAll( '.knuckle' ) as NodeListOf<HTMLElement> ) {
		const knuckle = exportKnuckle( HTMLknuckle );
		if ( knuckle.value1 === knuckle.value2 )
			maxDouble = Math.max( maxDouble, knuckle.value1 );
		else maxSum = Math.max( maxSum, knuckle.value1 + knuckle.value2 );
	}
	return [
		maxDouble < 0 ? null : maxDouble,
		maxSum,
	]
}
/**
 * Перерисовывает игровое поле
 */
function drawField(): void {
	let cell: HTMLButtonElement | null;
	while ((cell = document.querySelector('.cell')) !== null) {
	  	field.removeChild(cell);
	}
	
	const baseCell = document.createElement('button');
	baseCell.className = 'cell';
	cell = baseCell.cloneNode() as HTMLButtonElement;
	cell.addEventListener('click', selectCell);
	cell.dataset.x = String(baseX);
	cell.dataset.y = String(baseY);
	field.appendChild(cell);
	const height = Math.floor(field.clientHeight / (cell.clientHeight*1.027));
	const frg = document.createDocumentFragment();
	for (let i = baseY; i < baseY + height; i++)
	  	for (let j = baseX; j < baseX + 16; j++) {
			if (i === baseY && j === baseX) continue;
			cell = baseCell.cloneNode() as HTMLButtonElement;
			cell.addEventListener('click', selectCell);
			cell.dataset.x = String(j);
			cell.dataset.y = String(i);
			frg.appendChild(cell);
	  	}
	field.appendChild(frg);
	
	const knuckles = document.querySelectorAll('.placed.knuckle') as NodeListOf<HTMLButtonElement>;
	for (const elem of knuckles)
	  	drawKnuckle( elem );
}

/**
 * Обрабатывает выбор первой клетки
 * 
 * @param cell Клетка
 * @param x Координата 'x' клетки 
 * @param y Координата 'y' клетки
 */
function selectFirstCell(cell: HTMLButtonElement, x: number, y: number): void {
	const cells = field.querySelectorAll('.cell');
	for (const elem of cells) {
		if (elem !== cell)
		elem.classList.remove('selected');
	}
	if (cell.classList.toggle('selected')) {
		x1 = x;
		y1 = y;
	}
	else x1 = y1 = undefined;
	x2 = y2 = undefined;
}
  
/**
 * Возвращает строку для выбора клетки в querySelector
 * 
 * @param x Координата 'x' клетки 
 * @param y Координата 'y' клетки
 */
function getCell(x: number, y: number): string {
	return `.cell[data-x = \'${x}\'][data-y = \'${y}\']`;
}
  
/**
 * Обрабатывает выбор клетки
 * 
 * @param e Объект события (выбора клетки)
 */
function selectCell(e: Event): void {
	if ( selectedKnuckle?.classList.contains( 'placed' ) )
		return;
	const cell = e.target as HTMLButtonElement;
	const x = Number(cell.dataset.x);
	const y = Number(cell.dataset.y);
	if (x1 === undefined && y1 === undefined || x === x1 && y === y1 ||
		Math.abs(x - x1!) + Math.abs(y - y1!) > 1)
	  	selectFirstCell(cell, x, y);
	else if (x1 !== undefined && y1 !== undefined && x2 === undefined && y2 === undefined) {
		//select second cell
	  	x2 = x;
	  	y2 = y;
	  	cell.classList.toggle('selected');
	  	if (selectedKnuckle) placeKnuckle();
	}
	else selectFirstCell(cell, x, y);
}

/**
 * Помещает выбранную костяшку в выбранные клетки
 */
function placeKnuckle(): void {
	field.appendChild(selectedKnuckle!);
	if (!hand.children || hand.children.length % 7 === 0)
	  	drawField();
	selectedKnuckle!.classList.remove('selected');
	selectedKnuckle!.disabled = true;
	selectedKnuckle!.dataset.x = String(x1);
	selectedKnuckle!.dataset.y = String(y1);
	selectedKnuckle!.classList.add('placed');

	if (y1 !== y2) selectedKnuckle!.classList.add('vertical');
	if (y2! < y1! || x2! < x1!) selectedKnuckle!.classList.add('inverted');
	drawKnuckle( selectedKnuckle! );
	
	const firstCell = document.querySelector( getCell ( x1!, y1! ) ) as HTMLButtonElement;
	const secondCell = document.querySelector( getCell ( x2!, y2! ) ) as HTMLButtonElement;
	firstCell.classList.remove('selected');
	secondCell.classList.remove('selected');
	
	for ( let knuckle of hand.querySelectorAll( '.knuckle' ) as NodeListOf<HTMLButtonElement> )
		knuckle.disabled = true;
	cancel.disabled = false;
}

/**
 * Высчитывает графические координаты костяшки на основе координат первой/второй клетки
 * 
 * @param knuckle Костяшка
 * @param cell Клетка
 * @param deltaX Разность координат 'x' первой и второй клетки (необходима для второй клетки)
 * @param deltaY Разность координат 'y' первой и второй клетки (необходима для второй клетки)
 */
function calcPos( knuckle: HTMLButtonElement, cell: Element, deltaX?: number, deltaY?: number ): void {
	knuckle.style.left =
		(cell.getBoundingClientRect().left
		- (deltaX ? deltaX : 0) * ( knuckle.offsetHeight + knuckle.clientHeight ) / 2
		- field.getBoundingClientRect().left )
		* 100 / window.innerWidth
		+ "vw";
	knuckle.style.top =
		(cell.getBoundingClientRect().top
		- (deltaY ? deltaY : 0) * ( knuckle.offsetHeight + knuckle.clientHeight ) / 2
		- field.getBoundingClientRect().top )
		* 100 / window.innerWidth
		+ "vw";
}

/**
 * Отрисовывает костяшку
 * 
 * @param knuckle Костяшка
 * @param data Подробные данные о костяшке
 */
function drawKnuckle( knuckle: HTMLButtonElement, data?: Knuckle ): void {
	let x1: number, y1: number,
		x2: number | undefined, y2: number | undefined;
	if (data) {
		x1 = data.x1!;
		x2 = data.x2!;
		y1 = data.y1!;
		y2 = data.y2!;
	}
	else {
		x1 = Number(knuckle.dataset.x);
		y1 = Number(knuckle.dataset.y);
	}
	const firstCell = document.querySelector( getCell( x1, y1 ) );
	if (firstCell) {
		knuckle.classList.remove( "hidden" );
		calcPos( knuckle, firstCell );
	}
	else {
		if (x2 === undefined) {
	  	if (knuckle.classList.contains('vertical')) {
			x2 = x1;
			y2 = y1 + ( knuckle.classList.contains('inverted') ? -1 : 1 );
	  	}
		else {
			y2 = y1;
			x2 = x1 + ( knuckle.classList.contains('inverted') ? -1 : 1 );
		}}
		const secondCell = document.querySelector( getCell( x2!, y2! ) );
		if (secondCell) {
			knuckle.classList.remove( "hidden" );
			calcPos( knuckle, secondCell, x2! - x1, y2! - y1 );
		}
		else knuckle.classList.add( "hidden" );
	}
}

/**
 * Организует блок точек
 * 
 * @param dots Элемент, содержащий точки
 * @param value Количество точек
 */
function organizeDots(dots: SVGElement, value: number): void {
	switch (value) {
	  	case 6:
			dots.children[6].classList.add('horc', 'top');
			dots.children[5].classList.add('horc', 'bottom');
			// falls through
	  	case 5:
	  	case 4:
			dots.children[4].classList.add('left', 'top');
			dots.children[3].classList.add('right', 'bottom');
			// falls through
		case 3:
		case 2:
			dots.children[2].classList.add('right', 'top');
			dots.children[1].classList.add('left', 'bottom');
	}
	if (value % 2 === 1)
	  	dots.children[value].classList.add('verc', 'horc');
}

/**
 * Генерирует блок точек
 * 
 * @param value Количество точек
 */
function generateDots(value: number): SVGElement {
	const svgNS = 'http://www.w3.org/2000/svg';
	const dots = document.createElementNS(svgNS, 'svg');
	dots.classList.add('knuckle-dots');
	const num = document.createElementNS(svgNS, 'text');
	num.classList.add('value');
	num.appendChild(document.createTextNode(String(value)));
	dots.appendChild(num);
	for (let i = 0; i < value; i++) {
		const dot = document.createElementNS(svgNS, 'circle');
		dot.classList.add('knuckle-dot');
		dots.appendChild(dot);
	}
	organizeDots(dots, value);
	return dots;
}

/**
 * Генерирует костяшку с точками
 * 
 * @param v1 Первое значение
 * @param v2 Второе значение
 */
function generateKnuckle(v1: number, v2: number): HTMLButtonElement {
	const knuckle = document.createElement('button');
	knuckle.classList.add('knuckle', numerals[v1], numerals[v2]);
	knuckle.appendChild(generateDots(v1));
	const delimiter = document.createElement('span');
	delimiter.className = 'knuckle-delimiter';
	knuckle.appendChild(delimiter);
	knuckle.appendChild(generateDots(v2));
	knuckle.addEventListener('click', () => {
		const hand = document.querySelectorAll('.hand > .knuckle');
		for (const elem of hand)
			if (elem !== knuckle)
				elem.classList.remove('selected');
		
		if (knuckle.classList.toggle('selected')) {
			selectedKnuckle = knuckle;
			if ( x1 !== undefined && y1 !== undefined && x2 !== undefined && y2 !== undefined )
				placeKnuckle();
		}
		else selectedKnuckle = null;
	});
	
	return knuckle;
  }

/**
 * Генерирует костяшку и вставляет её в руку
 * 
 * @param value1 Первое значение
 * @param value2 Второе значение
 */
function insertKnuckle( value1: number, value2: number ): void {
	const knuckle = generateKnuckle(value1, value2);
	hand.appendChild(knuckle);
	const dots = knuckle.querySelectorAll('.knuckle-dots');
	for (const elem of dots)
	  	elem.setAttributeNS(null, 'viewBox', "0 0 " + String(elem.clientWidth) + " " + String(elem.clientHeight));
	if ( !hand.children || hand.children.length % 7 <= 1 )
		drawField();
}

function takeKnuckle(): void {
	knuckleTaker && knuckleTaker();
}

function setKnuckleTaker( taker: KnuckleTaker ): void {
	knuckleTaker = taker;
}

/**
 * Завершает ход
 */
function onSubmit(): void
{
	if ( hand.querySelectorAll( '.knuckle' ).length === 0 ) {
		finalizer && finalizer( 0 );
		return;
	}
	if ( selectedKnuckle === null || !selectedKnuckle.classList.contains( 'placed' ) )
		turnHandler && turnHandler( null );
	else turnHandler && turnHandler( exportKnuckle(selectedKnuckle) );
	x1 = y1 = x2 = y2 = undefined;
	cancel.disabled = true;
}

/**
 * Отменяет ход
 */
function onCancel(): void
{
	hand.appendChild(selectedKnuckle!);
	selectedKnuckle!.classList.remove( "placed", "vertical", "inverted" );
	for ( let knuckle of hand.querySelectorAll( '.knuckle' ) as NodeListOf<HTMLButtonElement> )
		knuckle.disabled = false;
	cancel.disabled = true;
	x1 = y1 = x2 = y2 = undefined;
	selectedKnuckle = null;
}

/**
 * Формирует подробные данные о костяшке для экспорта
 * 
 * @param knuckle Костяшка (графическое представление)
 */
function exportKnuckle( knuckle: HTMLElement ): Knuckle
{
	const values: Array<number> = [];
	for (let elem of knuckle.classList) {
		const value = numerals.indexOf(elem);
		if (value >= 0) values.push(value);
	}
	const value1 = values[0];
	const value2 = (values[1] ? values[1] : value1);
	return {
		value1: value1,
		value2: value2,
		x1: x1,
		y1: y1,
		x2: x2,
		y2: y2,
	}
}

/**
 * Обновляет экран игры
 * 
 * @param myTurn Ход текущего игрока?
 * @param knuckle Костяшка, положенная на предыдущем ходе
 */
function update( myTurn: boolean, knuckle: Knuckle | null ): void
{
	if (knuckle !== null) {
		const HTMLknuckle = generateKnuckle(knuckle.value1, knuckle.value2);
		HTMLknuckle.dataset.x = String(knuckle.x1);
		HTMLknuckle.dataset.y = String(knuckle.y1);
		if (knuckle.y1 !== knuckle.y2) HTMLknuckle.classList.add('vertical');
		if (knuckle.y2! < knuckle.y1! || knuckle.x2! < knuckle.x1!) HTMLknuckle.classList.add('inverted');
		HTMLknuckle.classList.add('placed');
		HTMLknuckle.disabled = true;
		field.appendChild( HTMLknuckle );
		const dots = HTMLknuckle.querySelectorAll('.knuckle-dots');
		for (const elem of dots)
			elem.setAttributeNS(null, 'viewBox', "0 0 " + String(elem.clientWidth) + " " + String(elem.clientHeight));
		drawKnuckle( HTMLknuckle, knuckle );
	}

	if ( myTurn )
	{
		darkBG.classList.add('hidden');
		hand.classList.remove('dark');
		for ( let knuckle of hand.querySelectorAll( '.knuckle' ) as NodeListOf<HTMLButtonElement> )
			knuckle.disabled = false;
		bazaar.disabled = false;
		endTurn.disabled = false;
		
		return;
	}
	
	darkBG.classList.remove('hidden');
	hand.classList.add('dark');
	bazaar.disabled = true;
	endTurn.disabled = true;
	selectedKnuckle = null;
}

/**
 * Подсчитывает сумму значений в руке игрока и передает финализатору
 */
function countResult(): number {
	let result: number = 0;
	for ( let HTMLknuckle of hand.querySelectorAll( '.knuckle' ) as NodeListOf<HTMLElement> ) {
		const knuckle = exportKnuckle( HTMLknuckle );
		hand.removeChild( HTMLknuckle );
		result += knuckle.value1 + knuckle.value2;
	}

	let knuckle: HTMLButtonElement | null;
	while ( ( knuckle = document.querySelector( '.knuckle' ) ) !== null) {
		field.removeChild( knuckle );
	}

	console.log("Sum of values in the hand: " + result);

	finalizer && finalizer( result );
	return result;
}

/**
 * Устанавливает обработчик хода игрока
 * 
 * @param handler Обработчик хода игрока
 */
function setTurnHandler( handler: TurnHandler ): void
{
	turnHandler = handler;
}

/**
 * Устанавливает финализатор игры
 * 
 * @param finalize Финализатор игры
 */
function setFinalizer( finalize: Finalizer ): void
{
	finalizer = finalize;
}

export type { Knuckle };

export {
	startInfo,
	drawField,
	insertKnuckle,
	update,
	onCancel,
	countResult,
	setTurnHandler,
	setKnuckleTaker,
	setFinalizer,
};
