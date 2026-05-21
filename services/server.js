// ADICIONAR JUNTO DAS MARCAS

const emailsTemporarios=[

"tempmail",
"10minutemail",
"guerrillamail",
"mailinator",
"trashmail",
"yopmail"

];


// ====================
// DENTRO DE /api/verificar
// ====================


// EMAIL

if(tipo==="EMAIL"){

const email=
texto.toLowerCase();

const dominioEmail=
email.split("@")[1];

motivos.push(
"Email identificado"
);

for(
let temp of emailsTemporarios
){

if(
dominioEmail.includes(temp)
){

score+=40;

motivos.push(
"Email temporário detectado"
);

}

}

}



// TELEFONE

if(
tipo==="TELEFONE/PIX"
){

motivos.push(
"Telefone/PIX identificado"
);

if(
totalDenuncias>=3
){

score+=30;

motivos.push(

`${totalDenuncias} denúncias encontradas para este número`

);

}

}



// CPF

if(
tipo==="CPF/PIX"
){

motivos.push(
"CPF válido identificado"
);

if(
totalDenuncias>=3
){

score+=30;

motivos.push(

`${totalDenuncias} denúncias encontradas para este CPF`

);

}

}



// PIX ALEATORIA

if(
tipo==="PIX ALEATORIA"
){

motivos.push(
"Chave PIX aleatória identificada"
);

if(
totalDenuncias>=3
){

score+=30;

motivos.push(

`${totalDenuncias} denúncias encontradas para esta chave`

);

}

}