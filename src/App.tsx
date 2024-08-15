import React, { useEffect, useRef, useState } from 'react';
import * as postServise from './api/todos';
import { Todo } from './types/Todo';
import { Actions } from './types/Actions';
import { ListOfTodos } from './components/ListOfTodos';
import { FooterTodos } from './components/FooterTodos';
import { ErrorNotification } from './components/ErrorNotification';
import { focusInput } from './utils/focusInput';
import HeaderTodos from './components/HeaderTodos/HeaderTodos';

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [error, setError] = useState('');
  const [showNotification, setShowNotification] = useState(true);
  const [filterActions, setFilterActions] = useState<Actions>(Actions.ALL);
  const [loading, setLoading] = useState<{ [key: number]: boolean }>({});
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const timeoutId = useRef<number | null>(null);
  const inputRef = useRef<{ focus: () => void }>(null);
  const [isEditTodo, setIsEditTodo] = useState<{
    [id: number]: boolean;
  } | null>(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    focusInput(inputRef);

    postServise
      .getTodos()
      .then(setTodos)
      .catch(() => {
        setShowNotification(false);
        setError('Unable to load todos');
        timeoutId.current = window.setTimeout(() => {
          setShowNotification(true);
        }, 3000);
      });

    return () => {
      if (timeoutId.current !== null) {
        clearTimeout(timeoutId.current);
      }
    };
  }, []);

  const errorNotification = (message: string) => {
    setShowNotification(false);
    setError(message);
    if (timeoutId.current !== null) {
      clearTimeout(timeoutId.current);
    }

    timeoutId.current = window.setTimeout(() => {
      setShowNotification(true);
    }, 3000);
  };

  const deleteTodo = (todoId: number) => {
    setLoading(prevLoading => ({ ...prevLoading, [todoId]: true }));
    postServise
      .deleteTodos(todoId)
      .then(() =>
        setTodos(currentTodos =>
          currentTodos.filter(({ id }) => id !== todoId),
        ),
      )
      .catch(() => {
        errorNotification('Unable to delete a todo');
      })
      .finally(() => {
        setLoading(prevLoading => {
          const { [todoId]: ignored, ...rest } = prevLoading;

          return rest;
        });
        focusInput(inputRef);
      });
  };

  const updateTodosFormServer = (todoFromServer: Todo) => {
    setTodos(currentTodos => {
      return currentTodos.map(currentTodo =>
        currentTodo.id === todoFromServer.id ? todoFromServer : currentTodo,
      );
    });
  };

  const handleLoading = (id: number, type: string) => {
    switch (type) {
      case 'turnOn':
        setLoading(prev => ({ ...prev, [id]: true }));
        break;
      case 'turnOff':
        setLoading(prev => {
          const { [id]: ignored, ...rest } = prev;

          return rest;
        });
        break;
    }
  };

  const updatedTodo = (newTodo: Todo) => {
    handleLoading(newTodo.id, 'turnOn');
    postServise
      .updateTodos(newTodo)
      .then(updateTodo => {
        const todo = updateTodo as Todo;

        updateTodosFormServer(todo);
        setEditTitle('');
        setIsEditTodo(null);
      })
      .catch(() => {
        errorNotification('Unable to update a todo');
      })
      .finally(() => {
        handleLoading(newTodo.id, 'turnOff');
      });
  };

  const clearCompleted = async () => {
    const completedTodos = todos.filter(todo => todo.completed);

    const deletePromises = completedTodos.map(
      todo =>
        new Promise<void>(resolve => {
          deleteTodo(todo.id);
          resolve();
        }),
    );

    await Promise.allSettled(deletePromises);
  };

  const setTodosFormServer = (todoFromServer: Todo) => {
    setTodos(currentTodos => [...currentTodos, todoFromServer as Todo]);
  };

  const hasCompletedTodos = todos.some(todo => todo.completed);

  const checkCompleted = todos?.every(todo => todo.completed === true);

  const promiseToggleComleted = (toggledTodo: Todo) => {
    return new Promise<void>(resolve => {
      updatedTodo(toggledTodo);
      resolve();
    });
  };

  const toggleAllCompleted = async () => {
    let togglePromises;

    if (checkCompleted) {
      togglePromises = todos.map(todo => {
        const toggleTodo = { ...todo, completed: false };

        return promiseToggleComleted(toggleTodo);
      });
    } else {
      const completedTodos = todos.filter(todo => !todo.completed);

      togglePromises = completedTodos.map(todo => {
        const toggleTodo = {
          ...todo,
          completed: todo.completed ? false : true,
        };

        return promiseToggleComleted(toggleTodo);
      });
    }

    await Promise.allSettled(togglePromises);
  };

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <HeaderTodos
          todos={todos}
          checkCompleted={checkCompleted}
          errorNotification={errorNotification}
          ref={inputRef}
          setTempTodo={setTempTodo}
          setTodos={setTodosFormServer}
          setLoading={handleLoading}
          toggleAll={toggleAllCompleted}
        />

        <ListOfTodos
          todos={todos}
          actions={filterActions}
          onDelete={deleteTodo}
          loading={loading}
          tempTodo={tempTodo}
          onUpdate={updatedTodo}
          isEditTodo={isEditTodo}
          setIsEditTodo={setIsEditTodo}
          editTitle={editTitle}
          setEditTitle={setEditTitle}
        />

        <FooterTodos
          todos={todos}
          handleAction={setFilterActions}
          hasComletedTodos={hasCompletedTodos}
          clearCompleted={() => clearCompleted()}
        />
      </div>

      <ErrorNotification
        showNotification={showNotification}
        errorMessage={error}
        deleteNotification={setShowNotification}
      />
    </div>
  );
};
