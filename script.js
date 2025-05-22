let tasks=[];
let editTaskID=null;
function initDB(){
    const request=indexedDB.open("TasksDB",1);
    request.onerror=()=>{
        tasks=JSON.parse(localStorage.getItem("tasks"))|| [];
        tasks.forEach((task)=>rendertask(task));
    }
    request.onupgradeneeded=()=>{
        let db=request.result;
        if(!db.objectStoreNames.contains("tasks")){
        let store=db.createObjectStore("tasks",{keyPath:'id'});
        store.createIndex('title','title',{unique:false});
        store.createIndex('stage','stage',{unique:false});
        }
    }
    request.onsuccess=()=>{
        let db=request.result;
        loadTasks(db);
    }
}
function loadTasks(db){   
    let transaction=db.transaction("tasks","readonly");
    let store=transaction.objectStore("tasks");
    let allTasks=store.getAll();
    allTasks.onsuccess=()=>{
        tasks=allTasks.result || [];
        tasks.forEach((task)=>rendertask(task));
    }
    updateSummary();
    dragAndDrop();
}
function handleform(){
    document.querySelector('#add-form').classList.remove('hidden');
    document.querySelector('#add-task').classList.add('hidden');
}
function handleCancelbtn(){
    document.querySelector('#add-form').classList.add('hidden');
    document.querySelector('.modal').classList.add('hidden');
    document.querySelector('#add-task').classList.remove('hidden');
}
function handletask(e,editform){
    e.preventDefault();
    let form=document.querySelector('#add-form');
    if(editform)
      form=document.querySelector('#edit-form');  
    let title=form.querySelector('input').value;
    if(title.trim().length==0)return;
    let desc=form.querySelector('textarea').value;
    let stage=form.querySelector('select').value;
    let date=new Date(Date.now()).toLocaleString('en-GB',{
        day:'2-digit',
        month:'short',
        year:'numeric'
        });
        if(editform){
            let index=tasks.findIndex(task=>task.id==editTaskID);
            tasks[index]={id:editTaskID,title,desc,stage,date};
            document.querySelector(`li[data-id="${editTaskID}"]`)?.remove();
            rendertask(tasks[index]);
            editTaskID=null;
        }
        else{
           let task={title,desc,stage,date,id:Date.now()};
           tasks.push(task);
           rendertask(task);          
        }
    savetasks();
    updateSummary();
    form.reset();
    handleCancelbtn();
}
function rendertask(task){
    let ul=document.querySelector(`#${task.stage}`);
    let li=document.createElement("li");
    li.classList.add('card');
    li.dataset.id=task.id;
    li.setAttribute('draggable','true');
    let isDone=task.stage==='Task-Done';
    li.innerHTML = `
    <h4 class="${(isDone)?"line-through":""}">${task.title}</h4>
    <p>${task.desc || 'No description'}</p>
    <div class="tool-container">
      <h5>Date: ${task.date}</h5>
      <div class="tool-container">
        <i class="fa-solid fa-pencil" style="color:${isDone?'gray':'brown'}; cursor:pointer;"></i>
        <i class="fa-solid fa-trash" style="color: red; cursor:pointer;"></i>
      </div>
    </div>
  `;
    li.querySelector('.fa-trash').addEventListener('click', () => {
        deleteTask(task.id);
    });
    li.querySelector('.fa-pencil').addEventListener('click', () => {
        if(isDone)return;
        editTask(task.id);
    });
    ul.appendChild(li);
    li.addEventListener('dragstart',(e)=>{
        e.dataTransfer.setData('text/plain',JSON.stringify(task));
    });
    updateSummary();
}
function deleteTask(id){
    tasks=tasks.filter(task=>task.id!==id);
    let li=document.querySelector(`li[data-id="${id}"]`);
    if(li)li.remove();
    savetasks();
    updateSummary();
}
function editTask(id){
    let task=tasks.find(task=>task.id==id);
    //want to show a modal pop-up
    let box=document.querySelector('.modal');
    box.classList.remove('hidden');

    box.querySelector('input').value=task.title;
    box.querySelector('textarea').value=task.desc;
    box.querySelector('select').value=task.stage;    
    editTaskID=id;
}
function savetasks(){
    const request=window.indexedDB.open("TasksDB",1);//db,version
    //error
    request.onerror=()=>{
        localStorage.setItem("tasks",JSON.stringify(tasks));
    }
    request.onsuccess=()=>{
        let db=request.result;
        let transaction=db.transaction("tasks","readwrite");

        let store=transaction.objectStore("tasks");

        store.clear().onsuccess = () => {
            tasks.forEach(task => {
                store.put(task);
            });
        };
    }
}
function updateSummary(){
    let total=tasks.length,done=0;
    tasks.forEach((task)=>{
        if(task.stage=="Task-Done")done++;
    });
    let percent = total === 0 ? 0 : ((done / total) * 100).toFixed(1);
    document.querySelector('#summary').innerHTML=`${done} out of ${total} tasks done(${percent}%)`;
}
function dragAndDrop(){
    let uls=document.querySelectorAll('ul');
    uls.forEach((ul)=>{
        ul.addEventListener('dragover',(e)=>{
        e.preventDefault();//this combo of dragover-preventDefault enables a drop
        //and after a drop happens then we handle a drop event or else it will never ever get triggered
    });
    ul.addEventListener('drop',(e)=>{
        e.preventDefault();
        let droppedTask=JSON.parse(e.dataTransfer.getData('text/plain'));
        let newStage=ul.getAttribute('id');
        //for the drop which has been dropped at the same place where it has been picked up
        if(droppedTask.stage==newStage)return;
        //for the drop at diff place
        let index=tasks.findIndex((task)=>task.id==droppedTask.id);
        tasks[index].stage=newStage;
        document.querySelector(`li[data-id="${droppedTask.id}"]`).remove();
        rendertask(tasks[index]);
        savetasks();
        updateSummary();
    })
   }
)};

document.addEventListener('DOMContentLoaded',()=>{
    initDB();
    document.querySelector('#add-task').addEventListener('click',()=> handleform());
    document.querySelector('#add').addEventListener('click',(e)=>handletask(e,false));
    document.querySelectorAll('.cancel-btn').forEach((cancel)=>cancel.addEventListener('click',handleCancelbtn));
    document.querySelector('#edit').addEventListener('click',(e)=>handletask(e,true));
})