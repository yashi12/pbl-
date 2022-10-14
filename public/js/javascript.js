
function func(){
  var value=document.getElementById("role").value;
  if (value==="Teacher"){
    document.getElementById("teacher").classList.remove("role");
    document.getElementById("student").classList.add("role");
  } else if (value==="Student") {
    document.getElementById("teacher").classList.add("role");
    document.getElementById("student").classList.remove("role");
  }
}

document.getElementById("role").addEventListener("click", func);
