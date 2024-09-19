import Database from "./db.js";

document.addEventListener("DOMContentLoaded", () => {
  const database = new Database("DBToDo", 1);
  database.init("title, description, deadline, done", () => showTasks());
  const form = document.querySelector("#toDoForm");
  const tasksContainer = document.querySelector("#taskContainer");
  form.addEventListener("submit", saveTask);

  const debounce = (callback, waitTime) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        callback(...args);
      }, waitTime);
    };
  };

  const titleFilterEl = document.getElementById("filterTitleInput");

  const dateFilterEl = document.getElementById("dateFilterInput");

  const searchData = (event, filterType) => {
    const filterQuery = event.target.value.trim();
    if (filterQuery) {
      const request = database.filterData(filterQuery, filterType);
      request.onsuccess = (event) => {
        if (request.result) {
          tasksContainer.innerHTML = "";
          renderData(request.result);
        }
      };
    } else {
      showTasks();
    }
  };

  const debounceHandler = debounce(searchData, 1000);

  titleFilterEl.addEventListener("input", (e) => debounceHandler(e, "title"));
  dateFilterEl.addEventListener("input", (e) => searchData(e, "deadline"));

  function saveTask(event) {
    event.preventDefault();
    const title = document.querySelector("#titleInput").value;
    const deadline = document.querySelector("#dateInput").value;
    const description = document.querySelector("#descriptionTextArea").value;
    const task = { title, description, deadline, done: false };
    const transaction = database.persist(task, () => form.reset());
    transaction.oncomplete = () => {
      console.log("Task added successfully!");
      showTasks();
    };
  }

  function showTasks() {
    // Leave the div empty
    while (tasksContainer.firstChild)
      tasksContainer.removeChild(tasksContainer.firstChild);

    const request = database.getOpenCursor();
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && cursor?.value) {
        renderData(cursor.value);

        cursor.continue();
      } else {
        if (!tasksContainer.firstChild) {
          const text = document.createElement("p");
          text.textContent = "There are no tasks to be shown.";
          tasksContainer.appendChild(text);
        }
      }
    };
  }

  function renderData(data) {
    const { key, title, description, deadline, done } = data;

    // card container
    const card = document.createElement("div");
    card.classList.add("card", done ? "card_done" : "card_to_do");
    card.classList.toggle("card_done", done);
    card.setAttribute("data-id", key);
    tasksContainer.appendChild(card);

    // card header
    const cardHeader = document.createElement("div");
    cardHeader.classList.add("card_header");

    const deadlineDiv = document.createElement("div");
    deadlineDiv.classList.add("card_deadline");
    deadlineDiv.innerText = `Deadline: ${deadline}`;

    // Creating the delete button element
    const deleteButton = document.createElement("div");
    deleteButton.classList.add("card_exit");
    deleteButton.setAttribute("aria-label", "delete");
    deleteButton.onclick = removeTask;

    cardHeader.appendChild(deadlineDiv);
    cardHeader.appendChild(deleteButton);
    card.appendChild(cardHeader);

    // card title
    const cardTitle = document.createElement("div");
    cardTitle.classList.add("card_title");
    cardTitle.innerHTML = title;
    card.appendChild(cardTitle);

    const cardDesc = document.createElement("p");
    cardDesc.classList.add("card_desc");
    cardDesc.innerHTML = description;
    card.appendChild(cardDesc);

    // Add a footer for controls
    const cardFooter = document.createElement("div");
    cardFooter.classList.add("card_footer");

    // Creating the edit task button element
    const editButton = document.createElement("a");
    editButton.classList.add("card_link");
    editButton.innerHTML = "Edit";
    editButton.setAttribute("aria-label", "edit");
    editButton.onclick = editTask;

    // Adding it to the controls container
    cardFooter.appendChild(editButton);

    // Creating the "done" checkbox
    const doneCheckbox = document.createElement("input");
    doneCheckbox.setAttribute("type", "checkbox");
    doneCheckbox.checked = done;
    doneCheckbox.onchange = toggleTaskDone;

    // Adding it to the controls container
    cardFooter.appendChild(doneCheckbox);
    card.appendChild(cardFooter);
  }

  function changeTask(event) {
    event.preventDefault();
    const key = Number(event.target.getAttribute("data-id"));
    const title = document.querySelector("#editTitle").value;
    const description = document.querySelector("#editDescription").value;
    const deadline = document.querySelector("#editDeadline").value;
    const done = document.querySelector("#editDone").checked;
    const task = { title, description, deadline, done, key };
    const form = document.querySelector("#editForm");
    const transaction = database.saveChanges(task, () => form.reset());
    transaction.oncomplete = () => {
      console.log("Task edited successfully!");
      const closeModal = document.getElementById("closeModel");
      closeModal.click();
      showTasks();
    };
  }

  function removeTask(event) {
    const task = event.currentTarget.closest(".card");
    const id = Number(task.getAttribute("data-id"));
    database.delete(id, () => {
      // Step 1
      tasksContainer.removeChild(task);

      // Step 2
      if (!tasksContainer.firstChild) {
        const text = document.createElement("p");
        text.textContent = "There are no tasks to be shown.";
        tasksContainer.appendChild(text);
      }

      // Optional Step 3: Console log for debugging purposes
      console.log(`Task with id ${id} deleted successfully.`);
    });
  }

  function toggleTaskDone(event) {
    const task = event.currentTarget.closest(".card");
    const isDone = event.currentTarget.checked;
    const id = Number(task.dataset.id);
    database.toggleDone(id, isDone, () => {
      task.classList.toggle("card_done", isDone);
      task.classList.toggle("card_to_do", !isDone);
    });
  }

  // filling up the modal with values of the respective to-do task
  function editTask(event) {
    const task = event.currentTarget.closest(".card");
    const id = Number(task.getAttribute("data-id"));
    const val = database.getField(id);
    val.onsuccess = () => {
      const { key, title, description, deadline, done } = val.result;
      const editTitle = document.getElementById("editTitle");
      editTitle.setAttribute("value", title);

      const editDeadline = document.getElementById("editDeadline");
      editDeadline.setAttribute("value", deadline);

      const editDescription = document.getElementById("editDescription");
      editDescription.innerHTML = description;

      document.getElementById("editDone").checked = done;
    };

    const modal = document.getElementById("openEditModal");
    modal.click();

    const saveChange = document.querySelector("#btnsave");
    saveChange.setAttribute("data-id", id);
    saveChange.onclick = changeTask;
  }
});
