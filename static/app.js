(function () {
  "use strict";

  angular.module("radOncAIApp", ['ui.bootstrap']).controller("ExamController", ['$interval', '$scope', ExamController]);

  function ExamController($interval, $scope) {
    var vm = this;

    // --- 1. LOAD MEMORY (MOVED TO TOP) ---
    // We do this FIRST so the rest of the app uses the saved data
    var savedHistory = localStorage.getItem('radOncChatHistory');
    var savedState = localStorage.getItem('radOncChatOpen');

    // FIX 1: Set these ONCE. Do not reset them to [] or false later.
    vm.chatHistory = savedHistory ? JSON.parse(savedHistory) : [];
    vm.isChatOpen = savedState === 'true'; 

    // For student chat
    var savedAnswer = localStorage.getItem('radOncAnswer');
    var savedSessionId = localStorage.getItem('radOncSessionId');
    vm.answerHistory = savedAnswer ? JSON.parse(savedAnswer) : [];
    // Load session_id from localStorage, use it for all subsequent API calls
    vm.session_id = savedSessionId || null;
    
    // Scroll to bottom on page load if there are messages
    if (vm.answerHistory.length > 0) {
      setTimeout(function() {
        var conversationEl = document.querySelector('.chat-messages');
        if (conversationEl) {
          conversationEl.scrollTop = conversationEl.scrollHeight;
        }
      }, 200);
    }


    // FIX 2: Removed 'vm.chatHistory = []' from here (it was erasing your data)
    
    vm.answer = "";
    vm.chatMessage = "";
    vm.showHints = false;
    vm.showRatingModal = false;
    vm.currentRating = null;
    vm.ratingComment = "";
    vm.isLoading = false;

    // For chatbot at bottom right of page
    vm.sendChatMessage = async function sendChatMessage() {
      if (!vm.chatMessage.trim()) return;

      vm.chatHistory.push({
        role: "user",
        message: vm.chatMessage.trim(),
      });

      var currentChatMessage = vm.chatMessage; 
      vm.chatMessage = ""; 
      vm.isLoading = true; 
        
      // SAVE after user types
      localStorage.setItem('radOncChatHistory', JSON.stringify(vm.chatHistory));

      try {
        // Note: Removed API_KEY argument since the backend handles it now
        var aiResponse = await buildFollowUp(currentChatMessage);

        $scope.$apply(function() {
            vm.isLoading = false; 
            vm.chatHistory.push({
                role: "chat_agent",
                message: aiResponse,
            });
            // SAVE after AI replies
            localStorage.setItem('radOncChatHistory', JSON.stringify(vm.chatHistory));
        });

      } catch (error) {
         console.error(error);
         $scope.$apply(function() {
             vm.isLoading = false; 
             vm.answerHistory.push({ role: "chat_agent", message: "Error contacting AI." });
         });
      }
    };

    vm.scrollToBottom = function() {
      setTimeout(function() {
        var conversationEl = document.querySelector('.chat-messages');
        if (conversationEl) {
          conversationEl.scrollTop = conversationEl.scrollHeight;
        }
      }, 100);
    };

    // For physics procedure chatbot
    vm.sendAnswer = async function sendAnswer() {
      if (!vm.answer.trim()) return;

      vm.answerHistory.push({
        role: "user",
        message: vm.answer.trim(),
      });

      var currentAnswer = vm.answer; 
      vm.answer = ""; 
      vm.isLoading = true; 
        
      // Ensure we have the latest session_id from localStorage before making the API call
      // This handles cases where session_id might have been updated in another tab/window
      if (!vm.session_id) {
        var storedSessionId = localStorage.getItem('radOncSessionId');
        vm.session_id = storedSessionId || null;
      }
        
      // SAVE after user types
      localStorage.setItem('radOncAnswer', JSON.stringify(vm.answerHistory));
      
      // Scroll to bottom after user message
      vm.scrollToBottom();

      try {
        // Pass the current session_id to maintain conversation context
        // The server will use this session_id or create a new one if it doesn't exist
        var aiResponse = await buildFollowUp(currentAnswer, vm.session_id);


        $scope.$apply(function() {
            vm.isLoading = false; 
            vm.answerHistory.push({
                role: "physics_procedure_agent",
                message: aiResponse.response,
            });
            // SAVE after AI replies
            localStorage.setItem('radOncAnswer', JSON.stringify(vm.answerHistory));
            if (aiResponse.session_id) {
              vm.session_id = aiResponse.session_id;
              localStorage.setItem('radOncSessionId', vm.session_id);
            }
            // Scroll to bottom after AI response
            vm.scrollToBottom();
        });

      } catch (error) {
         console.error(error);
         $scope.$apply(function() {
             vm.isLoading = false; 
             vm.answerHistory.push({ role: "physics_procedure_agent", message: "Error contacting AI." });
             vm.scrollToBottom();
         });
      }
    };

    vm.handleAnswerKeydown = function(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        vm.sendAnswer();
      }
    };

    vm.autoResizeTextarea = function(event) {
      setTimeout(function() {
        var textarea = event ? event.target : document.getElementById('answer');
        if (textarea) {
          textarea.style.height = 'auto';
          textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
        }
      }, 0);
    };

    vm.handleChatKeydown = function(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        vm.sendChatMessage();
      }
    };

    vm.isOnPage = function(pageName) {
      return window.location.pathname.indexOf(pageName) !== -1;
    };
    
    // FIX 3: Removed 'vm.isChatOpen = false' from here (it was overwriting the saved state)

    vm.toggleChat = function() {
        vm.isChatOpen = !vm.isChatOpen;
        localStorage.setItem('radOncChatOpen', vm.isChatOpen);
        
        if (vm.isChatOpen) {
            setTimeout(function() {
                var chatBody = document.querySelector('.chat-body');
                if(chatBody) chatBody.scrollTop = chatBody.scrollHeight;
            }, 50);
        }
    };

    vm.submitRating = async function() {
      var ratingData = {
          qa_history: vm.answerHistory,
          score: vm.currentRating,
          comment: vm.ratingComment
      };

      // Close modal immediately (synchronously) before async operation
      // This ensures the UI updates right away
      vm.showRatingModal = false;
      vm.currentRating = null;
      vm.ratingComment = '';

      try {
        var result = await addRating(ratingData);
        console.log("Rating submitted:", result);
      } catch (error) {
        console.error("Error submitting rating:", error);
      }
    };

    vm.skipRating = async function() {
      var ratingData = {
        qa_history: vm.answerHistory,
        score: null,
        comment: null
      };

      // Close modal immediately (synchronously) before async operation
      // This ensures the UI updates right away
      vm.showRatingModal = false;
      vm.currentRating = null;
      vm.ratingComment = '';

      try {
        var result = await addRating(ratingData);
        console.log("Rating skipped:", result);
      } catch (error) {
        console.error("Error skipping rating:", error);
      }
    };
  
    // Function to close/reset modal
    vm.closeRatingModal = function() {
        vm.showRatingModal = false;
        vm.currentRating = null;
        vm.ratingComment = '';
    };

    

    vm.resetSession = function resetSession() {
      if (vm.answerHistory.length > 0) {
        vm.showRatingModal = true;
      } 
      else {
        vm.showRatingModal = false;
      }
      vm.answerHistory = [];
      vm.session_id = null;
      localStorage.removeItem('radOncAnswer');
      localStorage.removeItem('radOncSessionId');
    };

    vm.$onDestroy = function onDestroy() {
      $interval.cancel(timer);
    };
  }


  async function buildFollowUp(answer, session_id=null) {
    console.log("Sending to backend:", answer);

    // Use configurable API endpoint (set in config.js or via environment variable)
    // Default to relative path for Flask compatibility
    const apiUrl = window.API_BASE_URL || '';
    const endpoint = apiUrl ? (apiUrl.endsWith('/') ? apiUrl + '/api/physicsprocedure/chat' : apiUrl + '/api/physicsprocedure/chat') : '/api/physicsprocedure/chat';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: answer, session_id: session_id || null })
      });

      if (!response.ok) {
        throw new Error(`Server Error: ${response.status}`);
      }

      const data = await response.json();
      
      // Support both 'reply' (frontend format) and 'response' (Flask format)
      return data;

    } catch (error) {
      console.error('Detailed Debug Error:', error.message);
      return "I'm sorry, I couldn't reach the server.";
    }
  }

  async function addRating(ratingData) {
    const apiUrl = window.API_BASE_URL || '';
    const endpoint = apiUrl ? (apiUrl.endsWith('/') ? apiUrl + 'api/physicsprocedure/rating' : apiUrl + '/api/physicsprocedure/rating') : '/api/physicsprocedure/rating';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ratingData)
      });

      if (!response.ok) {
        throw new Error(`Server Error: ${response.status}`);
      }

      const data = await response.json();
      return data.message || "Rating submitted successfully.";
    }
    catch (error) {
      console.error('Detailed Debug Error:', error.message);
      return "I'm sorry, I couldn't reach the server.";
    }
  }

})();