
let arrow = document.getElementById('arrow');
let menu = document.getElementById('menu');
let visible = false;



arrow.addEventListener('click',function(){

    if( !visible ){
        visible= !visible;
        menu.style.display = 'flex';
        arrow.style.rotate ='180deg';
    }
    else
    {
        visible= !visible;
        menu.style.display = 'none';
        arrow.style.rotate ='0deg';
    }
    

})
document.addEventListener('DOMContentLoaded', function() {
  const btn1 = document.getElementById('btn1');
  const btn2 = document.getElementById('btn2');
  const btn3 = document.getElementById('btn3');
  const btn4 = document.getElementById('btn4');
  const btn5 = document.getElementById('btn5');
  const btn6 = document.getElementById('btn6');
  const btn7 = document.getElementById('btn7');
  const btn8 = document.getElementById('btn8');
  const btn9 = document.getElementById('btn9');

  // Fonction pour réinitialiser la couleur de fond de tous les boutons
  function resetButtons() {
    btn1.style.backgroundColor = '#ffffff';
    btn2.style.backgroundColor = '#ffffff';
    btn3.style.backgroundColor = '#ffffff';
    btn4.style.backgroundColor = '#ffffff';
    btn5.style.backgroundColor = '#ffffff';
    btn6.style.backgroundColor = '#ffffff';
    btn7.style.backgroundColor = '#ffffff';
    btn8.style.backgroundColor = '#ffffff';
    btn9.style.backgroundColor = '#ffffff';
  }

  // Initialiser la couleur de fond du premier bouton
  btn3.style.backgroundColor = '#0082AE';

  btn1.addEventListener('click', function() {
    resetButtons();
    this.style.backgroundColor = '#0082AE';
    window.location.href = '/publier/page1'; 
  });

  btn2.addEventListener('click', function() {
    resetButtons();
    this.style.backgroundColor = '#0082AE';
    window.location.href = '/publier/page2'; 
  });

  btn3.addEventListener('click', function() {
    resetButtons();
    this.style.backgroundColor = '#0082AE';
  });

 
});


const precedentButton = document.getElementById('prec');

// "Précédent" goes back without submitting the form
if (precedentButton) {
  precedentButton.addEventListener('click', function() {
      window.location.href = '/publier/page2';
  });
}
// NOTE: no click handler on #suiv — the form POST /arrivee submits
// and the server redirects to /publier/page4.