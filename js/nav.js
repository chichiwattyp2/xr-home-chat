var gap = 0;
var page = 1;
var pages = 0;

function goNext(){
   if (page == pages+1) {
    null;
} else {
    gap -=22.1;
    document.querySelector("#container").setAttribute("position", {x: -3.15, y: gap+4, z: 0});
    page++;
    document.querySelector("#pageCounter").setAttribute("text", "value", page, "/", pages);
  }
}

function goBack(){
     if (page == 1) {
    null;
} else {
    gap +=22.1;
    document.querySelector("#nextArrow").setAttribute("position", {x: -3.15, y: gap+4, z: 0});
    page--;
    document.querySelector("#pageCounter").setAttribute("text", "value", page, "/", pages);
  }
}


      function autoVR() {
          document.querySelector('a-scene').enterVR();
    }

