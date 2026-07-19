import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

function AddCardModal({ isOpen, onClose, onSaved }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useRef(null);

  // Reset form state each time the modal opens
  useEffect(() => {
    if (isOpen) {
      setQuestion('');
      setAnswer('');
      setErrors({});
      setSubmitError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Close on Escape; trap focus inside the modal
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'button, textarea, input, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function validate() {
    const newErrors = {};
    if (!question.trim()) {
      newErrors.question = 'Question is required.';
    } else if (question.length > 500) {
      newErrors.question = 'Question must be 500 characters or fewer.';
    }
    if (!answer.trim()) {
      newErrors.answer = 'Answer is required.';
    } else if (answer.length > 500) {
      newErrors.answer = 'Answer must be 500 characters or fewer.';
    }
    return newErrors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    let saved = false;
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer }),
      });
      if (!res.ok) throw new Error('Server error');
      saved = true;
    } catch {
      setSubmitError('Failed to save card. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
    if (saved) onSaved();
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Add card" ref={dialogRef}>
      <h2>Add Card</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="question">Question</label>
          <textarea
            id="question"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            autoFocus
          />
          {errors.question && <p role="alert">{errors.question}</p>}
        </div>
        <div>
          <label htmlFor="answer">Answer</label>
          <textarea
            id="answer"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
          />
          {errors.answer && <p role="alert">{errors.answer}</p>}
        </div>
        {submitError && <p role="alert">{submitError}</p>}
        <button type="submit" disabled={isSubmitting}>Save</button>
        <button type="button" onClick={onClose}>Cancel</button>
      </form>
    </div>
  );
}

AddCardModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};

export default AddCardModal;
