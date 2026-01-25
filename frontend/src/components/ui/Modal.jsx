import React, { useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import clsx from "clsx";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import { X } from "./Icons";
import { Button } from "./Button";

/**
 * Modal Component - Glass Morphism Style + Responsive
 * Translucent modal with blur overlay
 * En móvil: Bottom Sheet (SwipeableDrawer)
 * En desktop: Modal tradicional centrado
 *
 * @param {boolean} isOpen - Controls modal visibility
 * @param {function} onClose - Callback when modal should close
 * @param {string} title - Modal title
 * @param {ReactNode} children - Modal content
 * @param {string} size - Modal size: 'sm' | 'md' | 'lg' | 'xl' | 'full'
 * @param {boolean} closeOnOverlayClick - Allow closing by clicking overlay (default: true)
 * @param {boolean} showCloseButton - Show X button in header (default: true)
 * @param {ReactNode} footer - Optional footer content
 * @param {string} className - Additional classes for modal content
 * @param {boolean} forceDesktop - Force desktop modal even on mobile
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  closeOnOverlayClick = true,
  showCloseButton = true,
  footer,
  className,
  forceDesktop = false,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Focus trap - get all focusable elements
  const getFocusableElements = useCallback(() => {
    if (!modalRef.current) return [];
    return modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
  }, []);

  // Handle keyboard navigation for focus trap
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") {
      onClose();
      return;
    }

    if (e.key !== "Tab") return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      // Shift + Tab: go to previous element
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: go to next element
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }, [onClose, getFocusableElements]);

  // Focus management on open/close
  useEffect(() => {
    if (isOpen) {
      // Store currently focused element
      previousActiveElement.current = document.activeElement;

      // Focus the first focusable element in modal after a short delay
      const timer = setTimeout(() => {
        const focusableElements = getFocusableElements();
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }, 50);

      return () => clearTimeout(timer);
    } else {
      // Restore focus to previous element when closing
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }
  }, [isOpen, getFocusableElements]);

  // Handle keyboard events (only for desktop modal)
  useEffect(() => {
    if (!isOpen || (isMobile && !forceDesktop)) return;

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown, isMobile, forceDesktop]);

  // Prevent body scroll when modal is open (only for desktop)
  useEffect(() => {
    if (!isMobile || forceDesktop) {
      if (isOpen) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, isMobile, forceDesktop]);

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-7xl",
  };

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  // Modal content (shared between mobile and desktop)
  const ModalContent = (
    <>
      {/* Header */}
      <div className={clsx(
        "flex items-center justify-between border-b border-[var(--border-glass-subtle)]",
        isMobile && !forceDesktop ? "px-4 pt-4 pb-3" : "px-6 pt-6 pb-4"
      )}>
        {/* Swipe indicator for mobile */}
        {isMobile && !forceDesktop && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-300 rounded-full" />
        )}
        <h2 id="modal-title" className={clsx(
          "font-semibold text-[var(--text-primary)]",
          isMobile && !forceDesktop ? "text-lg" : "text-xl"
        )}>{title}</h2>
        {showCloseButton && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-all duration-300 ease-spring text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-glass)] min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className={clsx(
        "overflow-y-auto",
        isMobile && !forceDesktop
          ? "px-4 py-4 max-h-[60vh]"
          : "px-6 py-4 max-h-[calc(100vh-200px)]"
      )}>
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div className={clsx(
          "flex items-center gap-3 border-t border-[var(--border-glass-subtle)]",
          isMobile && !forceDesktop
            ? "flex-col-reverse sm:flex-row sm:justify-end px-4 pb-4 pt-3"
            : "justify-end px-6 pb-6 pt-4"
        )}>
          {footer}
        </div>
      )}
    </>
  );

  // Mobile: Bottom Sheet usando SwipeableDrawer
  if (isMobile && !forceDesktop) {
    return (
      <SwipeableDrawer
        anchor="bottom"
        open={isOpen}
        onClose={onClose}
        onOpen={() => {}}
        disableSwipeToOpen
        swipeAreaWidth={0}
        ModalProps={{
          keepMounted: false,
        }}
        PaperProps={{
          sx: {
            borderTopLeftRadius: '1rem',
            borderTopRightRadius: '1rem',
            maxHeight: '90vh',
            background: 'var(--card-glass-strong)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: 'var(--shadow-elevated)',
          },
        }}
      >
        <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="modal-title">
          {ModalContent}
        </div>
      </SwipeableDrawer>
    );
  }

  // Desktop: Modal tradicional
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in"
      style={{
        backgroundColor: 'var(--overlay)',
        backdropFilter: 'blur(var(--blur-sm))',
        WebkitBackdropFilter: 'blur(var(--blur-sm))',
      }}
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={{
          background: 'var(--card-glass-strong)',
          backdropFilter: 'blur(var(--blur-lg))',
          WebkitBackdropFilter: 'blur(var(--blur-lg))',
          boxShadow: 'var(--shadow-elevated), 0 0 0 1px var(--border-glass-strong)',
        }}
        className={clsx(
          // Glass modal container
          "relative w-full",
          "border border-[var(--border-glass)]",
          "rounded-xl",
          "shadow-glass",
          "animate-scale-in",
          sizeClasses[size],
          className
        )}
      >
        {ModalContent}
      </div>
    </div>
  );
}

/**
 * ConfirmModal - Pre-configured modal for confirmations
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar",
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "primary",
}) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="danger" onClick={onClose}>
            {cancelText}
          </Button>
          <Button variant={variant} onClick={handleConfirm}>
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="text-sm text-[var(--text-secondary)]">{message}</p>
    </Modal>
  );
}

/**
 * AlertModal - Pre-configured modal for alerts
 */
export function AlertModal({
  isOpen,
  onClose,
  title = "Aviso",
  message,
  buttonText = "Entendido",
  variant = "primary",
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <Button variant={variant} onClick={onClose}>
          {buttonText}
        </Button>
      }
    >
      <p className="text-sm text-[var(--text-secondary)]">{message}</p>
    </Modal>
  );
}

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node,
  size: PropTypes.oneOf(["sm", "md", "lg", "xl", "full"]),
  closeOnOverlayClick: PropTypes.bool,
  showCloseButton: PropTypes.bool,
  footer: PropTypes.node,
  className: PropTypes.string,
  forceDesktop: PropTypes.bool,
};

ConfirmModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.string,
  message: PropTypes.node,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  variant: PropTypes.string,
};

AlertModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  message: PropTypes.node,
  buttonText: PropTypes.string,
  variant: PropTypes.string,
};

export default Modal;
