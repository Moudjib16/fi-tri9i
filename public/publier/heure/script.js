
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

let clock =document.getElementById("clock");
let time = document.querySelectorAll('#time-option');
let arr = document.getElementById('arr');
let white = document.getElementById('white');
let prix= document.getElementById("prix");

function clockmenu(){
  

        if( white.style.display == 'none'){
            prix.style.display='none'
            white.style.display = 'flex';
            arr.style.rotate ='0deg';
            clock.style.backgroundColor='white'
        }
        else
        {
            prix.style.display = 'flex';
            white.style.display = 'none';
            arr.style.rotate ='180deg';
            clock.style.backgroundColor='#E3F1F6'

        }
 
}

arr.addEventListener('click',function(){
       clockmenu()
})



console.log(clock)

time.forEach(function(event) {
    event.addEventListener('click', function() {
        clock.value = event.innerText;
        clockmenu()
    });
});






 // Get a reference to the "precedent" button
const precedentButton = document.getElementById('precedent');

// "Précédent" goes back without losing form state
if (precedentButton) {
  precedentButton.addEventListener('click', function() {
      window.history.back();
  });
}
// NOTE: no click handler on #prochaine here — the inline script in
// heure.ejs saves via fetch('/time') then navigates to /publier/people.





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
    btn6.style.backgroundColor = '#0082AE';
  
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
      window.location.href = '/publier/page3'; 
    });
  
    btn4.addEventListener('click', function() {
      resetButtons();
      this.style.backgroundColor = '#0082AE';
      window.location.href = '/publier/page4'; 
    });
  
        btn5.addEventListener('click', function() {
          resetButtons();
          this.style.backgroundColor = '#0082AE';
          window.location.href = '/publier/calendaire'; 
        });
      
        btn6.addEventListener('click', function() {
          resetButtons();
          this.style.backgroundColor = '#0082AE';
        });
      
      
  });
  
  