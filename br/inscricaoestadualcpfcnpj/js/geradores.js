const regexSomenteNumeros = /\D/gi;

function gerarInscricaoEstadualPR(baseSemente) {

	let soma = 0;
	let resto = 0;
	const multiplicadores = [4, 3, 2, 7, 6, 5, 4, 3, 2];
	let sementeFloat = Math.round(Math.random() * 100000000);
	let semente = '' + baseSemente + sementeFloat.toString();
	semente = semente.substr(0, 8);

	for (let i = 1; i < multiplicadores.length; i++) {
		soma += parseInt(semente[i - 1], 10) * multiplicadores[i];
	}

	resto = soma % 11;
	if (resto < 2) {
		resto = 0;
	} else {
		resto = 11 - resto;
	}

	semente += resto;
	soma = 0;

	for (let i = 0; i < multiplicadores.length; i++) {
		soma += parseInt(semente[i], 10) * multiplicadores[i];
	}

	resto = soma % 11;
	if (resto < 2) {
		resto = 0;
	} else {
		resto = 11 - resto;
	}

	semente += resto;

	return semente;

}

// #region cpf

function gerarCpf(baseSemente) {

	baseSemente = baseSemente.toString().replace(regexSomenteNumeros, '');

	if (!validaterCpfSemente(baseSemente)) {
		baseSemente = '';
	}

	let semente = '';

	do {

		// gera números de 0 a 9
		// vai chamar Math.random 9 vezes mas evita
		// ter que verificar se existem números faltando
		let sementeDigitos = [0, 0, 0, 0, 0, 0, 0, 0, 0];
		sementeDigitos = sementeDigitos.map(_ => {
			let numero = Math.random();
			while (numero === 1) {
				numero = Math.random();
			}
			numero = Math.round(numero * 10);
			return numero;
		});

		semente = sementeDigitos.reduce(
			(accumulator, currentValue) => {
				return accumulator + currentValue.toString();
			},
			''
		);

		semente = baseSemente + semente;
		semente = semente.substr(0, 9);

	} while (!validaterCpfSemente(semente));

	let cpf = semente + gerarCpfDigitosVerificadores(semente);

	return cpf;

}

function validarCpf(cpf) {

	let somenteNumeros = cpf.toString().replace(regexSomenteNumeros, '');

	if (somenteNumeros.length !== 11) {
		return false;
	}

	let semente = somenteNumeros.substr(0, 9);

	if (!validaterCpfSemente(semente)) {
		return false;
	}

	let digitosVerificadores = gerarCpfDigitosVerificadores(semente);

	if (somenteNumeros.substr(9, 2) !== digitosVerificadores) {
		return false;
	}

	return true;

}

function validaterCpfSemente(baseSemente) {

	let semente = baseSemente.toString().replace(regexSomenteNumeros, '');

	if (semente !== '000000000'
		&& semente !== '111111111'
		&& semente !== '222222222'
		&& semente !== '333333333'
		&& semente !== '444444444'
		&& semente !== '555555555'
		&& semente !== '666666666'
		&& semente !== '777777777'
		&& semente !== '888888888'
		&& semente !== '999999999'
		&& semente !== '000000001'
		&& semente.toString().length === 9
		) {

		return true;
	}

	return false;

}

function gerarCpfDigitosVerificadores(semente) {

	semente = semente.toString().replace(regexSomenteNumeros, '');

	if (semente === '000000000'
		|| semente === '111111111'
		|| semente === '222222222'
		|| semente === '333333333'
		|| semente === '444444444'
		|| semente === '555555555'
		|| semente === '666666666'
		|| semente === '777777777'
		|| semente === '888888888'
		|| semente === '999999999'
		|| semente === '000000001'
		|| semente.toString().length > 9
		) {

		return '';

	}

	let soma = 0;
	let resto = 0;
	const multiplicadores = [ 11, 10, 9, 8, 7, 6, 5, 4, 3, 2 ];
	let digitosVerificadores = '';

	for (let i = 1; i < multiplicadores.length; i++) {
		soma += parseInt(semente[i - 1], 10) * multiplicadores[i];
	}

	resto = soma % 11;
	if (resto < 2) {
		resto = 0;
	} else {
		resto = 11 - resto;
	}

	digitosVerificadores += resto.toString();
	semente += digitosVerificadores;
	soma = 0;

	for (let i = 0; i < multiplicadores.length; i++) {
		soma += parseInt(semente[i], 10) * multiplicadores[i];
	}

	resto = soma % 11;
	if (resto < 2) {
		resto = 0;
	} else {
		resto = 11 - resto;
	}

	digitosVerificadores += resto.toString();

	return digitosVerificadores;

}

// #endregion

function gerarCnpj(baseSemente) {

	//

}



export { gerarInscricaoEstadualPR, gerarCpf, validarCpf, gerarCnpj }