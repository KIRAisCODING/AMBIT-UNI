import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Loader2, MessageSquare, AlertCircle } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  // Required fields
  const [rating, setRating] = useState<number | null>(null);
  const [clarity, setClarity] = useState<string>('');
  const [workflowUnderstanding, setWorkflowUnderstanding] = useState<string>('');
  const [featuresUsed, setFeaturesUsed] = useState<string[]>([]);
  const [regularUse, setRegularUse] = useState<string>('');

  // Optional fields
  const [confusion, setConfusion] = useState<string>('');
  const [frustration, setFrustration] = useState<string>('');
  const [usefulPart, setUsefulPart] = useState<string>('');
  const [missingFeature, setMissingFeature] = useState<string>('');
  const [missMost, setMissMost] = useState<string>('');
  const [recommendationScore, setRecommendationScore] = useState<number | null>(null);
  const [additionalFeedback, setAdditionalFeedback] = useState<string>('');

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showValidationWarning, setShowValidationWarning] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  // Focus trap on open
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Options configurations
  const clarityOptions = [
    'Very confusing',
    'Somewhat confusing',
    'Neutral',
    'Mostly clear',
    'Immediately clear'
  ];

  const workflowOptions = [
    "Doesn't make sense",
    'Somewhat confusing',
    'Makes sense',
    'Very intuitive'
  ];

  const featureOptions = [
    'Inbox',
    'Areas / Projects / SubProjects',
    'Tasks',
    'Habits',
    'Calendar',
    'Analytics',
    'Settings',
    'Other'
  ];

  const regularUseOptions = [
    'Definitely',
    'Probably',
    'Maybe',
    'Probably not',
    'No'
  ];

  const toggleFeature = (feat: string) => {
    if (featuresUsed.includes(feat)) {
      setFeaturesUsed(featuresUsed.filter(f => f !== feat));
    } else {
      setFeaturesUsed([...featuresUsed, feat]);
    }
  };

  const validateForm = () => {
    if (
      rating === null ||
      !clarity ||
      !workflowUnderstanding ||
      featuresUsed.length === 0 ||
      !regularUse
    ) {
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setShowValidationWarning(false);

    if (!validateForm()) {
      setShowValidationWarning(true);
      // Scroll to top of modal container
      if (modalRef.current) {
        modalRef.current.scrollTop = 0;
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          clarity,
          workflowUnderstanding,
          featuresUsed,
          confusion,
          frustration,
          usefulPart,
          missingFeature,
          regularUse,
          missMost,
          recommendationScore,
          additionalFeedback,
          route: window.location.pathname || "Settings",
        }),
      });

      if (response.ok) {
        setSuccess(true);
      } else {
        const errorData = await response.json();
        setErrorMsg(errorData.error || "Failed to submit feedback. Please try again.");
      }
    } catch (err) {
      setErrorMsg("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setRating(null);
    setClarity('');
    setWorkflowUnderstanding('');
    setFeaturesUsed([]);
    setRegularUse('');
    setConfusion('');
    setFrustration('');
    setUsefulPart('');
    setMissingFeature('');
    setMissMost('');
    setRecommendationScore(null);
    setAdditionalFeedback('');
    setSuccess(false);
    setErrorMsg('');
    setShowValidationWarning(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-all duration-300 pointer-events-auto"
      />

      {/* Modal Dialog Card */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative bg-surface dark:bg-zinc-950 border border-border/80 p-8 rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto hide-scrollbar flex flex-col focus:outline-none animate-scale-in z-10 pointer-events-auto"
      >
        {/* Close Button */}
        {!isSubmitting && (
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-surfaceSecondary text-textSecondary hover:text-textPrimary transition-all cursor-pointer"
            title="Close"
          >
            <X size={20} />
          </button>
        )}

        {success ? (
          // Success State
          <div className="flex flex-col items-center text-center py-12">
            <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <Check size={32} />
            </div>
            <h2 className="text-2xl font-headline font-bold text-textPrimary mb-3 tracking-tight">
              Thanks. Your feedback has been recorded.
            </h2>
            <p className="text-sm text-textSecondary max-w-md leading-relaxed mb-8">
              Your feedback is incredibly valuable to us and will directly shape the upcoming improvements for the Ambit beta.
            </p>
            <button
              onClick={handleReset}
              className="bg-pill-active text-pill-active-text hover:opacity-95 px-6 py-3 rounded-full text-xs font-semibold shadow-md transition-all hover:scale-[1.02] cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          // Form State
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="border-b border-border/60 pb-5 mb-1 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-pill-active text-pill-active-text rounded-xl shadow-sm">
                  <MessageSquare size={20} />
                </div>
                <h2 className="text-xl md:text-2xl font-headline font-bold text-textPrimary tracking-tight">
                  Help improve Ambit
                </h2>
              </div>
              <p className="text-sm text-textSecondary leading-relaxed">
                You're one of the first people using Ambit. Your feedback directly shapes what gets built next.
              </p>
            </div>

            {/* Error notifications */}
            {errorMsg && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-4 rounded-2xl flex items-start gap-2.5 text-xs text-red-600 dark:text-red-300 font-semibold">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {showValidationWarning && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-4 rounded-2xl flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300 font-semibold">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>Please fill out all required fields (marked with *).</span>
              </div>
            )}

            {/* QUESTION 1: Rating (1-5) */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-textPrimary flex items-center gap-1">
                <span>1. How would you rate your experience with Ambit? *</span>
              </label>
              <div className="flex items-center gap-2.5 pt-1">
                {[1, 2, 3, 4, 5].map((num) => {
                  const isSelected = rating === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setRating(num)}
                      className={`w-11 h-11 rounded-xl font-bold text-sm transition-all border flex items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'bg-pill-active text-pill-active-text border-transparent shadow-md'
                          : 'bg-surfaceSecondary dark:bg-zinc-900 text-textSecondary hover:bg-pill border-border'
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-[11px] text-textSecondary font-semibold px-0.5 max-w-[270px]">
                <span>1 = Very poor</span>
                <span>5 = Excellent</span>
              </div>
            </div>

            {/* QUESTION 2: Clarity */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-textPrimary">
                2. How easy was it to understand what Ambit is and how to use it? *
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {clarityOptions.map((opt) => {
                  const isSelected = clarity === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setClarity(opt)}
                      className={`px-4 py-2.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-pill-active text-pill-active-text border-transparent shadow-sm'
                          : 'bg-surfaceSecondary dark:bg-zinc-900 text-textSecondary hover:bg-pill border-border'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* QUESTION 3: Workflow */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-textPrimary flex flex-col gap-0.5">
                <span>3. How well does this workflow make sense to you? *</span>
                <span className="text-[11px] text-textSecondary font-headline mt-0.5 uppercase tracking-wide">
                  Capture → Organize → Execute → Review
                </span>
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {workflowOptions.map((opt) => {
                  const isSelected = workflowUnderstanding === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setWorkflowUnderstanding(opt)}
                      className={`px-4 py-2.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-pill-active text-pill-active-text border-transparent shadow-sm'
                          : 'bg-surfaceSecondary dark:bg-zinc-900 text-textSecondary hover:bg-pill border-border'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* QUESTION 4: Features Used */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-textPrimary">
                4. What did you actually use? (Select all that apply) *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {featureOptions.map((opt) => {
                  const isSelected = featuresUsed.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleFeature(opt)}
                      className={`flex items-center gap-3 px-4.5 py-3 rounded-2xl text-xs font-semibold border transition-all text-left cursor-pointer ${
                        isSelected
                          ? 'bg-pill-active text-pill-active-text border-transparent shadow-sm'
                          : 'bg-surfaceSecondary dark:bg-zinc-900 text-textSecondary hover:bg-pill border-border'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'bg-pill-active-text border-transparent'
                          : 'border-textSecondary/50 bg-surface'
                      }`}>
                        {isSelected && <Check size={10} className="text-pill-active" />}
                      </div>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* QUESTION 5: Confusion (Optional) */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-textPrimary">
                5. Was there anything you didn't understand or weren't sure how to use?
              </label>
              <textarea
                value={confusion}
                onChange={(e) => setConfusion(e.target.value.substring(0, 5000))}
                placeholder="Tell me what confused you..."
                className="w-full bg-surfaceSecondary dark:bg-zinc-900 border border-border rounded-2xl p-4 text-xs text-textPrimary placeholder:text-textMuted outline-none focus:ring-1 focus:ring-accent min-h-[90px] resize-y"
                maxLength={5000}
              />
            </div>

            {/* QUESTION 6: Frustration (Optional) */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-textPrimary">
                6. Did anything feel slow, broken, unnecessary, or harder than it should be?
              </label>
              <textarea
                value={frustration}
                onChange={(e) => setFrustration(e.target.value.substring(0, 5000))}
                placeholder="Be brutally honest. This is exactly what this field is for."
                className="w-full bg-surfaceSecondary dark:bg-zinc-900 border border-border rounded-2xl p-4 text-xs text-textPrimary placeholder:text-textMuted outline-none focus:ring-1 focus:ring-accent min-h-[90px] resize-y"
                maxLength={5000}
              />
            </div>

            {/* QUESTION 7: Useful Part (Optional) */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-textPrimary">
                7. What part of Ambit did you find genuinely useful?
              </label>
              <textarea
                value={usefulPart}
                onChange={(e) => setUsefulPart(e.target.value.substring(0, 5000))}
                placeholder="Tell us what you liked..."
                className="w-full bg-surfaceSecondary dark:bg-zinc-900 border border-border rounded-2xl p-4 text-xs text-textPrimary placeholder:text-textMuted outline-none focus:ring-1 focus:ring-accent min-h-[90px] resize-y"
                maxLength={5000}
              />
            </div>

            {/* QUESTION 8: Missing Feature (Optional) */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-textPrimary">
                8. What is the one thing you expected Ambit to do that it currently doesn't?
              </label>
              <textarea
                value={missingFeature}
                onChange={(e) => setMissingFeature(e.target.value.substring(0, 5000))}
                placeholder="Describe your expected feature..."
                className="w-full bg-surfaceSecondary dark:bg-zinc-900 border border-border rounded-2xl p-4 text-xs text-textPrimary placeholder:text-textMuted outline-none focus:ring-1 focus:ring-accent min-h-[90px] resize-y"
                maxLength={5000}
              />
            </div>

            {/* QUESTION 9: Regular Use */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-textPrimary">
                9. Could you see yourself using Ambit regularly? *
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {regularUseOptions.map((opt) => {
                  const isSelected = regularUse === opt;
                  return (
                    <button
                      key={opt}
                      type="button;;"
                      onClick={() => setRegularUse(opt)}
                      className={`px-4.5 py-2.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-pill-active text-pill-active-text border-transparent shadow-sm'
                          : 'bg-surfaceSecondary dark:bg-zinc-900 text-textSecondary hover:bg-pill border-border'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* QUESTION 10: Miss Most (Optional) */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-textPrimary">
                10. If Ambit disappeared tomorrow, what would you miss most?
              </label>
              <textarea
                value={missMost}
                onChange={(e) => setMissMost(e.target.value.substring(0, 5000))}
                placeholder="What would you miss..."
                className="w-full bg-surfaceSecondary dark:bg-zinc-900 border border-border rounded-2xl p-4 text-xs text-textPrimary placeholder:text-textMuted outline-none focus:ring-1 focus:ring-accent min-h-[90px] resize-y"
                maxLength={5000}
              />
            </div>

            {/* QUESTION 11: Recommend Score (Optional) */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-textPrimary">
                11. How likely are you to recommend Ambit to someone who struggles with managing their work?
              </label>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {Array.from({ length: 11 }, (_, i) => i).map((score) => {
                  const isSelected = recommendationScore === score;
                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setRecommendationScore(score)}
                      className={`w-9 h-9 rounded-lg font-bold text-xs transition-all border flex items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'bg-pill-active text-pill-active-text border-transparent shadow-md'
                          : 'bg-surfaceSecondary dark:bg-zinc-900 text-textSecondary hover:bg-pill border-border'
                      }`}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-[10px] text-textSecondary font-semibold px-0.5 max-w-[400px]">
                <span>0 = Not at all likely</span>
                <span>10 = Extremely likely</span>
              </div>
            </div>

            {/* QUESTION 12: Additional Feedback (Optional) */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-textPrimary">
                12. Anything else you'd like me to know?
              </label>
              <textarea
                value={additionalFeedback}
                onChange={(e) => setAdditionalFeedback(e.target.value.substring(0, 5000))}
                placeholder="Write any other thoughts here..."
                className="w-full bg-surfaceSecondary dark:bg-zinc-900 border border-border rounded-2xl p-4 text-xs text-textPrimary placeholder:text-textMuted outline-none focus:ring-1 focus:ring-accent min-h-[90px] resize-y"
                maxLength={5000}
              />
            </div>

            {/* Submission Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="px-5 py-2.5 rounded-full text-xs font-semibold text-textSecondary hover:bg-surfaceSecondary hover:text-textPrimary transition-all cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-pill-active text-pill-active-text hover:opacity-95 px-6 py-2.5 rounded-full text-xs font-semibold shadow-md transition-all hover:scale-[1.02] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-45 disabled:scale-100 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Submitting feedback...</span>
                  </>
                ) : (
                  <span>Submit feedback</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
