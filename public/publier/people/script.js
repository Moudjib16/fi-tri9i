
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







let plusbtn=document.getElementById('pluss');
let minusbtn=document.getElementById('minuss');
let prix=document.getElementById('prix');


function adjust_color()
{    
if(parseInt(prix.value) <= 3 && parseInt(prix.value) > 1)
{
    prix.style.color='green';

  
}
else 
{
if(parseInt(prix.value) > 3)
{
    prix.style.color='#e05457'; 
  
  
    

}
else{
    prix.style.color='black'; 
}
}
}



let p1 = document.getElementById('p1');
let p2 = document.getElementById('p2');
let p3 = document.getElementById('p3');
let p4 = document.getElementById('p4');
let p5 = document.getElementById('p5');

console.log(p1);


function update_caracters(a){
    switch(a){
    case 1:
        p1.style.display='none';
        p2.style.display='none';
        p4.style.display='none';
        p5.style.display='none';
    break;
    case 2:
        p1.style.display='block';
        p2.style.display='none';
        p4.style.display='none';
        p5.style.display='none';
    break;
    case 3:
        p1.style.display='block';
        p2.style.display='none';
        p4.style.display='none';
        p5.style.display='block';
    break;
    case 4:
        p1.style.display='block';
        p2.style.display='block';
        p4.style.display='none';
        p5.style.display='block';
    break;
    case 5:
        p1.style.display='block';
        p2.style.display='block';
        p4.style.display='block';
        p5.style.display='block';
    break;

    default:
        p1.style.display='none';
        p2.style.display='none';
        p4.style.display='none';
        p5.style.display='none';
    }

}



prix.addEventListener('input',function(event){

    adjust_color();
    update_caracters(parseInt(prix.value));
})


plusbtn.addEventListener('click',function(){
if(parseInt(prix.value) < 5)
{
    prix.value=parseInt(prix.value)+1;
    adjust_color();
    update_caracters(parseInt(prix.value));
}

})


minusbtn.addEventListener('click',function(){
if(parseInt(prix.value) > 1)
{
    prix.value=parseInt(prix.value)-1;
    adjust_color();
    update_caracters(parseInt(prix.value));
}

     
 })




 // Get a reference to the "precedent" button
const precedentButton = document.getElementById('precedent');

// "Précédent" goes back without losing form state
if (precedentButton) {
  precedentButton.addEventListener('click', function() {
      window.history.back();
  });
}
// NOTE: no click handler on #prochaine here — the inline script in
// people.ejs saves via fetch('/places') then navigates to /publier/prix.





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
    btn7.style.backgroundColor = '#0082AE';
  
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
          window.location.href = '/publier/heure'; 
        });
      
        btn7.addEventListener('click', function() {
          resetButtons();
          this.style.backgroundColor = '#0082AE';
        });
      
      
  });
  
  