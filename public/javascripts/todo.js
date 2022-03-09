document.addEventListener('DOMContentLoaded', async () => {
  class Todos {
    /*
      This class should hold information about todos and provide functions to 
      help render the handle bars template when called on by event handlers
    */
    constructor(todos) {
      this.todos = todos;
      this.mainTemplate = Handlebars.compile(
        document.getElementById('main_template').innerHTML
      );
      this.selection = {
        select: 'All Todos',
        completed: false,
      };
    }

    //returns all todos which have completed set to true
    completedTodos() {
      return this.todos.filter((obj) => obj.completed);
    }

    //sorts todos by dates
    sortDates(todoCopy) {
      return todoCopy.slice().sort((a, b) => {
        if (!(a.month || a.year) && !(b.month || b.year)) {
          return 0;
        } else if (!(b.month || b.year)) {
          return 1;
        } else if (!(a.month || a.year)) {
          return -1;
        } else {
          return a.month - b.month + (a.year - b.year) * 13;
        }
      });
    }

    //updates a todo for a certain id, to a new todo
    updateTodoById(id, newTodo) {
      const index = this.todos.findIndex((todo) => todo.id === Number(id));
      this.todos[index] = newTodo;
    }

    //returns an object of an array of todos with dates as their properties name
    getTodosByDate() {
      const todosDates = {};
      this.sortDates(this.todos).forEach((todo) => {
        if (todosDates[`${todo.month}/${todo.year}`]) {
          todosDates[`${todo.month}/${todo.year}`].push(todo);
        } else if (todo.month && todo.year) {
          todosDates[`${todo.month}/${todo.year}`] = [todo];
        } else if (todosDates['No Due Date']) {
          todosDates['No Due Date'].push(todo);
        } else {
          todosDates['No Due Date'] = [todo];
        }
      });
      return todosDates;
    }

    //deletes a todo at a certain ID
    deleteATodoById(id) {
      const index = this.todos.findIndex((todo) => todo.id === Number(id));
      if (index > -1) {
        this.todos.splice(index, 1);
      }
    }

    //adds a single todo to the todo array
    addOneTodo(todoData) {
      this.todos = this.todos.concat(todoData);
    }

    //returns a todo with a specific ID
    getTodoById(id) {
      return this.todos.find((todo) => todo.id === Number(id));
    }

    //returns an object of arrays with completed todos with dates as for the properties name
    getDoneTodosByDate() {
      const doneTodos = {};
      const todosByDate = this.getTodosByDate();
      for (const prop in todosByDate) {
        if (todosByDate[prop].some((todo) => todo.completed)) {
          doneTodos[prop] = todosByDate[prop].filter((obj) => obj.completed);
        }
      }
      return doneTodos;
    }

    //toggles true/false on a todo with a specified id
    flipCompleteATodoById(id) {
      const todo = this.getTodoById(id);
      todo.completed = !todo.completed;
    }

    //returns an array of todos that fulfill the selection requirements
    getSelected() {
      let selectedArray;
      //filter out completed vs non completed todos
      if (
        (this.selection.completed &&
          this.getDoneTodosByDate()[this.selection.select]) ||
        this.selection.select === 'Completed'
      ) {
        selectedArray = this.completedTodos();
      } else {
        //when a nav item disappeared from the completed list and "fell back" to the all todos version of the list
        //the todoManager would still view the todo that's completed as selected, this fixes by it, by setting the selection
        //to non completed items
        this.selection.completed = false;
        selectedArray = this.todos;
      }
      //filters based on date
      if (this.selection.select === 'No Due Date') {
        selectedArray = selectedArray.filter(
          (todo) => !todo.month || !todo.year
        );
      } else if (
        this.selection.select !== 'All Todos' &&
        this.selection.select !== 'Completed'
      ) {
        selectedArray = selectedArray.filter(
          (todo) =>
            todo.month === this.selection.select.substring(0, 2) &&
            todo.year === this.selection.select.substring(3)
        );
      }

      //sets due_date property for each todo for the handle bars template
      selectedArray.forEach((todo) => {
        if (todo.month && todo.year) {
          todo.due_date = `${todo.month}/${todo.year}`;
        } else {
          todo.due_date = `No Due Date`;
        }
      });

      //sorts completed items to the bottom of the list
      selectedArray = selectedArray.sort(this.sortByCompleted);
      return selectedArray;
    }

    //sorts completed todos to the bottom of the list
    sortByCompleted(todo1, todo2) {
      if (todo1.completed && todo2.completed) {
        return 0;
      } else if (todo1.completed) {
        return 1;
      } else if (todo2.completed) {
        return -1;
      } else {
        return 0;
      }
    }

    //applies the active class to the last clicked element after handle bars re-renders
    applyActive() {
      const navNodes = document.querySelectorAll(
        `[data-title="${this.selection.select}"]`
      );
      if (this.selection.completed) {
        navNodes[navNodes.length - 1].classList.add('active');
      } else if (navNodes.length === 0) {
        document.getElementById('all_todos').classList.add('active');
      } else {
        navNodes[0].classList.add('active');
      }
    }

    //applies templates and renders the HTML to the DOM
    renderHandleBars() {
      let appendedDiv = document.getElementById('applyHandlebars');
      if (!appendedDiv) {
        const partials = document.querySelectorAll('[data-type="partial"]');
        appendedDiv = document.createElement('div');
        appendedDiv.setAttribute('id', 'applyHandlebars');
        for (let i = 0; i < partials.length; i++) {
          Handlebars.registerPartial(partials[i].id, partials[i].innerHTML);
        }
      }
      appendedDiv.innerHTML = this.mainTemplate({
        todos: this.todos,
        done: this.completedTodos(),
        todos_by_date: this.getTodosByDate(),
        done_todos_by_date: this.getDoneTodosByDate(),
        selected: this.getSelected(),
        current_section: {
          title: this.selection.select,
          data: this.getSelected().length,
        },
      });
      document.body.appendChild(appendedDiv);

      //this applies the active class to the current selected element
      this.applyActive();
    }
  }

  //creates a new todo based on the results of the get request
  const todoManager = fetch('/api/todos', {
    method: 'GET',
  })
    .then((res) => res.json())
    .then((r) => new Todos(r));
  await todoManager.then((todo) => todo.renderHandleBars());

  //Pages always loads with All todos selected, this applies active styling
  document.getElementById('all_header').classList.add('active');

  //Event delegation is used here to allow for handlebars to rerender the page without loosing all the event handlers
  document.addEventListener('click', async (event) => {
    event.preventDefault();
    const formModal = document.getElementById('form_modal');
    const allSideBar = document.getElementById('sidebar');
    //this contains to event instructions for when the add a new todo label is clicked on
    if (event.target.classList.contains('addNewTodo')) {
      //this styles the modal to pop up
      modalPopUp();
      //this adds an event listener that handles the on submit and on mark as complete
      formModal.addEventListener('click', newFormClick);
      //this handles deleting a todo based on if the trashcan is clicked or the surrounding little area
    } else if (
      event.target.classList.contains('delete') ||
      event.target.getAttribute('alt') === 'Delete'
    ) {
      deleteTodoEvent(event);
      //this handles when a todo is clicked on and needs to updated
      //the and was included to make sure that the attribute for 'for' exists if it doesn't it returns null and doesn't evaluate
      //the second half of the statement, this was done to prevent a type error of calling includes on null
    } else if (
      event.target.getAttribute('for') &&
      event.target.getAttribute('for').includes('item_')
    ) {
      modalPopUp();
      const putID = event.target.getAttribute('for').match(/[0-9]+/)[0];
      const todoToUpdate = await todoManager.then((obj) =>
        obj.getTodoById(putID)
      );
      //fills out the form form based on given information

      fillOutForm(todoToUpdate);

      //adds an event listener for updating the todo
      //handles both save and complete

      formModal.addEventListener('click', updateTodoEvent);

      //this handles clicking on the check mark, or the non text elements of a todo to mark it complete
    } else if (
      event.target.classList.contains('list_item') ||
      event.target.classList.contains('check')
    ) {
      completeTodoEvent(event);
      //this handles the side bar clicks, highlights and rerenders as properly
    } else if (
      allSideBar.contains(event.target) &&
      !allSideBar.isSameNode(event.target) &&
      event.target.tagName !== 'SECTION'
    ) {
      navBarClickEvent(event);
    }
  });

  //sets the todoManagers selection object to the date and completed status of the clicked nav bar element
  async function navBarClickEvent(event) {
    const selectedNode = changeActiveNode(event.target);
    const allCompletedParentNode = document.getElementById('completed_items');
    const todoCompleted = allCompletedParentNode.contains(selectedNode);
    await todoManager.then((obj) => {
      obj.selection = {
        select: selectedNode.getAttribute('data-title'),
        completed: todoCompleted,
      };
      obj.renderHandleBars();
    });
  }

  //makes a put request to complete the clicked todo
  async function completeTodoEvent(event) {
    let completeID;
    if (event.target.classList.contains('list_item')) {
      completeID = event.target.childNodes[1]
        .getAttribute('id')
        .match(/[0-9]+/)[0];
    } else {
      completeID = event.target.parentNode.childNodes[1]
        .getAttribute('id')
        .match(/[0-9]+/)[0];
    }
    const completeTodo = await todoManager.then((obj) =>
      obj.getTodoById(completeID)
    );

    const completeResponse = await fetch(
      '/api/todos/' + completeID,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: !completeTodo.completed }),
      }
    );
    if (completeResponse.ok) {
      await todoManager.then((obj) => {
        obj.flipCompleteATodoById(completeID);
        obj.renderHandleBars();
      });
    }
  }

  //makes a post request for a new todo and handles validating input
  async function newFormClick(e) {
    e.stopPropagation();
    e.preventDefault();
    const formModal = document.getElementById('form_modal');
    if (e.target.getAttribute('type') === 'submit') {
      const newTodoFormData = new FormData(
        formModal.getElementsByTagName('form')[0]
      );
      if (newTodoFormData.get('title').trim().length >= 3) {
        const postResponse = await fetch('/api/todos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formatFormData(newTodoFormData)),
        });
        if (postResponse.ok) {
          await postResponse
            .json()
            .then((res) => todoManager.then((obj) => obj.addOneTodo([res])));
          await todoManager.then((obj) => {
            obj.selection = { select: 'All Todos', completed: false };
            obj.renderHandleBars();
          });
        }
      } else {
        alert(
          "The todo's title must be at least 3 characters long, not including white space"
        );
      }
    } else if (e.target.getAttribute('name') === 'complete') {
      alert("You cannot complete a todo you haven't added yet");
    }
  }

  //makes a put request to update a todo by the given form data
  async function updateTodoEvent(event) {
    event.stopPropagation();
    event.preventDefault();
    if (event.target.getAttribute('type') === 'submit') {
      const updateTodoFormData = new FormData(
        formModal.getElementsByTagName('form')[0]
      );
      if (updateTodoFormData.get('title').trim().length >= 3) {
        const putResponse = await fetch(
          '/api/todos/' + putID,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(formatFormData(updateTodoFormData)),
          }
        );
        if (putResponse.ok) {
          await putResponse
            .json()
            .then((res) =>
              todoManager.then((obj) => obj.updateTodoById(putID, res))
            );
          await todoManager.then((obj) => obj.renderHandleBars());
        }
      } else {
        alert(
          "The todo's title must be at least 3 characters long, not including white space"
        );
      }
    } else if (event.target.getAttribute('name') === 'complete') {
      const completeResponse = await fetch(
        '/api/todos/' + putID,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ completed: true }),
        }
      );
      if (completeResponse.ok) {
        await todoManager.then((obj) => {
          if (!todoToUpdate.completed) {
            obj.flipCompleteATodoById(putID);
          }
          obj.renderHandleBars();
        });
      } else {
        alert('did not go through');
      }
    }
  }

  //makes a delete request to delete the clicked on todo
  async function deleteTodoEvent(event) {
    const deleteID =
      event.target.parentNode.getAttribute('data-id') ||
      event.target.parentNode.parentNode.getAttribute('data-id');

    const deleteRequest = fetch('/api/todos/' + deleteID, {
      method: 'DELETE',
    });
    await deleteRequest.then(async (res) => {
      if (res.ok) {
        await todoManager.then((obj) => {
          obj.deleteATodoById(deleteID);
          obj.renderHandleBars();
        });
      }
    });
  }

  //this pops up the modal and adds a click event to hide it
  function modalPopUp() {
    const formModal = document.getElementById('form_modal');
    const modalBackGround = document.getElementById('modal_layer');
    formModal.style.display = 'block';
    formModal.style.top = '200px';
    modalBackGround.style.display = 'block';
    modalBackGround.addEventListener('click', async (e) => {
      e.stopPropagation();
      formModal.style.display = 'none';
      modalBackGround.style.display = 'none';

      const formTitle = formModal.getElementsByTagName('input')[0];
      const formSelect = formModal.getElementsByTagName('select');
      const formTextBox = formModal.getElementsByTagName('textarea')[0];

      formTitle.value = '';
      formTextBox.value = '';
      for (let i = 0; i < formSelect.length; i++) {
        formSelect[i].value = '';
      }
      await todoManager.then((obj) => obj.renderHandleBars());
    });
  }

  //this fills out the form with previous todo information when editing a todo
  function fillOutForm(todo) {
    const formModal = document.getElementById('form_modal');
    const formTitle = formModal.getElementsByTagName('input')[0];
    const formSelect = formModal.getElementsByTagName('select');
    const formTextBox = formModal.getElementsByTagName('textarea')[0];
    formTitle.value = todo.title;
    formTextBox.value = todo.description;
    for (let i = 0; i < formSelect.length; i++) {
      formSelect[i].value = todo[formSelect[i].getAttribute('id').substring(4)];
    }
  }

  //the data has the name of due_day/month/year this function formats it correctly for the api
  function formatFormData(formData) {
    const sanitizedTodo = {};

    for (let entry of formData.entries()) {
      if (entry[0].includes('due_')) {
        sanitizedTodo[entry[0].substring(4)] = /[0-9]+/.test(entry[1])
          ? entry[1]
          : '';
      } else {
        sanitizedTodo[entry[0]] = entry[1];
      }
    }
    return sanitizedTodo;
  }

  //this finds the parent node of an element for when the side bar is clicked
  //this returns the element we want to apply the active class to
  function changeActiveNode(target) {
    let selectedNode;
    if (target.tagName === 'DIV') {
      selectedNode = target.childNodes[1];
    } else {
      selectedNode = target;
      while (!selectedNode.getAttribute('data-title')) {
        selectedNode = selectedNode.parentNode;
      }
    }
    return selectedNode;
  }
});
