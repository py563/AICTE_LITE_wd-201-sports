/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
var token = document
  .querySelector('meta[name="csrf-token"]')
  .getAttribute("content");

function deleteVoter(electionId, voterId) {
  fetch(`/edit-election/${electionId}/delete-voter/${voterId}`, {
    method: "delete",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      _csrf: token,
    }),
  })
    .then((res) => {
      if (res.ok) {
        window.location.reload();
      }
    })
    .catch((err) => console.error(err));
}

function deleteQuestion(electionId, questionId) {
  fetch(`/edit-election/${electionId}/delete-question/${questionId}`, {
    method: "delete",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      _csrf: token,
    }),
  })
    .then((res) => {
      if (res.ok) {
        window.location.reload();
      }
    })
    .catch((err) => console.error(err));
}
