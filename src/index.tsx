'use client';

import React from 'react';
import ReactDOM from 'react-dom';

import { getAsset, Loader } from './assets';
import { useIsDocumentHidden } from './hooks';
import { toast, ToastState } from './state';
import './styles.css';
import {
  isAction,
  SwipeDirection,
  type ExternalToast,
  type HeightT,
  type ToasterProps,
  type ToastProps,
  type ToastT,
  type ToastToDismiss,
} from './types';

// Visible toasts amount
const VISIBLE_TOASTS_AMOUNT = 3;

// Viewport padding
const VIEWPORT_OFFSET = '24px';

// Mobile viewport padding
const MOBILE_VIEWPORT_OFFSET = '16px';

// Default toast width
const TOAST_WIDTH = 356;

// Default gap between toasts
const GAP = 14;

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

const Toast = (props: ToastProps) => {
  const {
    invert: ToasterInvert,
    toast,
    unstyled,
    interacting,
    setHeights,
    visibleToasts,
    heights,
    index,
    toasts,
    expanded,
    defaultRichColors,
    style,
    cancelButtonStyle,
    actionButtonStyle,
    className = '',
    descriptionClassName = '',
    position,
    gap,
    expandByDefault,
    classNames,
    icons,
  } = props;
  const [mounted, setMounted] = React.useState(false);
  const [initialHeight, setInitialHeight] = React.useState(0);
  const toastRef = React.useRef<HTMLLIElement>(null);
  const isFront = index === 0;
  const isVisible = expanded || index + 1 <= visibleToasts;
  const toastType = toast.type;
  const toastClassname = toast.className || '';
  const toastDescriptionClassname = toast.descriptionClassName || '';
  // Height index is used to calculate the offset as it gets updated before the toast array, which means we can calculate the new layout faster.
  const heightIndex = React.useMemo(
    () => heights.findIndex((height) => height.toastId === toast.id) || 0,
    [heights, toast.id],
  );
  const offset = React.useRef(0);
  const [y, x] = position.split('-');
  const toastsHeightBefore = React.useMemo(() => {
    return heights.reduce((prev, curr, reducerIndex) => {
      // Calculate offset up until current toast
      if (reducerIndex >= heightIndex) {
        return prev;
      }

      return prev + curr.height;
    }, 0);
  }, [heights, heightIndex]);

  const invert = toast.invert || ToasterInvert;
  const disabled = toastType === 'loading';

  offset.current = React.useMemo(() => heightIndex * gap + toastsHeightBefore, [heightIndex, toastsHeightBefore]);

  React.useEffect(() => {
    // Trigger enter animation without using CSS animation
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const toastNode = toastRef.current;
    if (toastNode) {
      const height = toastNode.getBoundingClientRect().height;
      // Add toast height to heights array after the toast is mounted
      setInitialHeight(height);
      setHeights((h) => [{ toastId: toast.id, height, position: toast.position }, ...h]);
      return () => setHeights((h) => h.filter((height) => height.toastId !== toast.id));
    }
  }, [setHeights, toast.id]);

  React.useLayoutEffect(() => {
    // Keep height up to date with the content in case it updates
    if (!mounted) return;
    const toastNode = toastRef.current;
    const originalHeight = toastNode.style.height;
    toastNode.style.height = 'auto';
    const newHeight = toastNode.getBoundingClientRect().height;
    toastNode.style.height = originalHeight;

    setInitialHeight(newHeight);

    setHeights((heights) => {
      const alreadyExists = heights.find((height) => height.toastId === toast.id);
      if (!alreadyExists) {
        return [{ toastId: toast.id, height: newHeight, position: toast.position }, ...heights];
      } else {
        return heights.map((height) => (height.toastId === toast.id ? { ...height, height: newHeight } : height));
      }
    });
  }, [mounted, toast.title, toast.description, setHeights, toast.id, toast.jsx, toast.action, toast.cancel]);

  function getLoadingIcon() {
    if (icons?.loading) {
      return (
        <div
          className={cn(classNames?.loader, toast?.classNames?.loader, 'sonner-loader')}
          data-visible={toastType === 'loading'}
        >
          {icons.loading}
        </div>
      );
    }

    return <Loader className={cn(classNames?.loader, toast?.classNames?.loader)} visible={toastType === 'loading'} />;
  }

  const icon = toast.icon || icons?.[toastType] || getAsset(toastType);

  return (
    <li
      tabIndex={0}
      ref={toastRef}
      className={cn(
        className,
        toastClassname,
        classNames?.toast,
        toast?.classNames?.toast,
        classNames?.default,
        classNames?.[toastType],
        toast?.classNames?.[toastType],
      )}
      data-sonner-toast=""
      data-rich-colors={toast.richColors ?? defaultRichColors}
      data-styled={!Boolean(toast.jsx || toast.unstyled || unstyled)}
      data-mounted={mounted}
      data-promise={Boolean(toast.promise)}
      data-visible={isVisible}
      data-y-position={y}
      data-x-position={x}
      data-index={index}
      data-front={isFront}
      data-type={toastType}
      data-invert={invert}
      data-expanded={Boolean(expanded || (expandByDefault && mounted))}
      style={
        {
          '--index': index,
          '--toasts-before': index,
          '--z-index': toasts.length - index,
          '--offset': `${offset.current}px`,
          '--initial-height': expandByDefault ? 'auto' : `${initialHeight}px`,
          ...style,
          ...toast.style,
        } as React.CSSProperties
      }
    >
      {/* TODO: This can be cleaner */}
      {(toastType || toast.icon || toast.promise) &&
      toast.icon !== null &&
      (icons?.[toastType] !== null || toast.icon) ? (
        <div data-icon="" className={cn(classNames?.icon, toast?.classNames?.icon)}>
          {toast.promise || (toast.type === 'loading' && !toast.icon) ? toast.icon || getLoadingIcon() : null}
          {toast.type !== 'loading' ? icon : null}
        </div>
      ) : null}

      <div data-content="" className={cn(classNames?.content, toast?.classNames?.content)}>
        <div data-title="" className={cn(classNames?.title, toast?.classNames?.title)}>
          {toast.jsx ? toast.jsx : typeof toast.title === 'function' ? toast.title() : toast.title}
        </div>
        {toast.description ? (
          <div
            data-description=""
            className={cn(
              descriptionClassName,
              toastDescriptionClassname,
              classNames?.description,
              toast?.classNames?.description,
            )}
          >
            {typeof toast.description === 'function' ? toast.description() : toast.description}
          </div>
        ) : null}
      </div>
      {React.isValidElement(toast.cancel) ? (
        toast.cancel
      ) : toast.cancel && isAction(toast.cancel) ? (
        <button
          data-button
          data-cancel
          style={toast.cancelButtonStyle || cancelButtonStyle}
          onClick={(event) => {
            // We need to check twice because typescript
            if (!isAction(toast.cancel)) return;
            toast.cancel.onClick?.(event);
          }}
          className={cn(classNames?.cancelButton, toast?.classNames?.cancelButton)}
        >
          {toast.cancel.label}
        </button>
      ) : null}
      {React.isValidElement(toast.action) ? (
        toast.action
      ) : toast.action && isAction(toast.action) ? (
        <button
          data-button
          data-action
          style={toast.actionButtonStyle || actionButtonStyle}
          onClick={(event) => {
            // We need to check twice because typescript
            if (!isAction(toast.action)) return;
            toast.action.onClick?.(event);
          }}
          className={cn(classNames?.actionButton, toast?.classNames?.actionButton)}
        >
          {toast.action.label}
        </button>
      ) : null}
    </li>
  );
};

function getDocumentDirection(): ToasterProps['dir'] {
  if (typeof window === 'undefined') return 'ltr';
  if (typeof document === 'undefined') return 'ltr'; // For Fresh purpose

  const dirAttribute = document.documentElement.getAttribute('dir');

  if (dirAttribute === 'auto' || !dirAttribute) {
    return window.getComputedStyle(document.documentElement).direction as ToasterProps['dir'];
  }

  return dirAttribute as ToasterProps['dir'];
}

function assignOffset(defaultOffset: ToasterProps['offset'], mobileOffset: ToasterProps['mobileOffset']) {
  const styles = {} as React.CSSProperties;

  [defaultOffset, mobileOffset].forEach((offset, index) => {
    const isMobile = index === 1;
    const prefix = isMobile ? '--mobile-offset' : '--offset';
    const defaultValue = isMobile ? MOBILE_VIEWPORT_OFFSET : VIEWPORT_OFFSET;

    function assignAll(offset: string | number) {
      ['top', 'right', 'bottom', 'left'].forEach((key) => {
        styles[`${prefix}-${key}`] = typeof offset === 'number' ? `${offset}px` : offset;
      });
    }

    if (typeof offset === 'number' || typeof offset === 'string') {
      assignAll(offset);
    } else if (typeof offset === 'object') {
      ['top', 'right', 'bottom', 'left'].forEach((key) => {
        if (offset[key] === undefined) {
          styles[`${prefix}-${key}`] = defaultValue;
        } else {
          styles[`${prefix}-${key}`] = typeof offset[key] === 'number' ? `${offset[key]}px` : offset[key];
        }
      });
    } else {
      assignAll(defaultValue);
    }
  });

  return styles;
}

function useSonner() {
  const [activeToasts, setActiveToasts] = React.useState<ToastT[]>([]);

  React.useEffect(() => {
    return ToastState.subscribe((toast) => {
      // Prevent batching, temp solution.
      setTimeout(() => {
        ReactDOM.flushSync(() => {
          setActiveToasts((toasts) => {
            const indexOfExistingToast = toasts.findIndex((t) => t.id === toast.id);

            // Update the toast if it already exists
            if (indexOfExistingToast !== -1) {
              return [
                ...toasts.slice(0, indexOfExistingToast),
                { ...toasts[indexOfExistingToast], ...toast },
                ...toasts.slice(indexOfExistingToast + 1),
              ];
            }

            return [toast, ...toasts];
          });
        });
      });
    });
  }, []);

  return {
    toasts: activeToasts,
  };
}

const Toaster = React.forwardRef<HTMLElement, ToasterProps>(function Toaster(props, ref) {
  const {
    invert,
    position = 'bottom-right',
    hotkey = ['altKey', 'KeyT'],
    expand,
    className,
    offset,
    mobileOffset,
    theme = 'light',
    richColors,
    style,
    visibleToasts = VISIBLE_TOASTS_AMOUNT,
    toastOptions,
    dir = getDocumentDirection(),
    gap = GAP,
    icons,
    containerAriaLabel = 'Notifications',
  } = props;
  const [toasts, setToasts] = React.useState<ToastT[]>([]);
  const possiblePositions = React.useMemo(() => {
    return Array.from(
      new Set([position].concat(toasts.filter((toast) => toast.position).map((toast) => toast.position))),
    );
  }, [toasts, position]);
  const [heights, setHeights] = React.useState<HeightT[]>([]);
  const [expanded, setExpanded] = React.useState(false);
  const [interacting, setInteracting] = React.useState(false);
  const [actualTheme, setActualTheme] = React.useState(
    theme !== 'system'
      ? theme
      : typeof window !== 'undefined'
      ? window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : 'light',
  );

  const listRef = React.useRef<HTMLOListElement>(null);
  const hotkeyLabel = hotkey.join('+').replace(/Key/g, '').replace(/Digit/g, '');
  const lastFocusedElementRef = React.useRef<HTMLElement>(null);
  const isFocusWithinRef = React.useRef(false);

  React.useEffect(() => {
    return ToastState.subscribe((toast) => {
      // Prevent batching, temp solution.
      setTimeout(() => {
        ReactDOM.flushSync(() => {
          setToasts((toasts) => {
            const indexOfExistingToast = toasts.findIndex((t) => t.id === toast.id);

            // Update the toast if it already exists
            if (indexOfExistingToast !== -1) {
              return [
                ...toasts.slice(0, indexOfExistingToast),
                { ...toasts[indexOfExistingToast], ...toast },
                ...toasts.slice(indexOfExistingToast + 1),
              ];
            }

            return [toast, ...toasts];
          });
        });
      });
    });
  }, [toasts]);

  React.useEffect(() => {
    if (theme !== 'system') {
      setActualTheme(theme);
      return;
    }

    if (theme === 'system') {
      // check if current preference is dark
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        // it's currently dark
        setActualTheme('dark');
      } else {
        // it's not dark
        setActualTheme('light');
      }
    }

    if (typeof window === 'undefined') return;
    const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    try {
      // Chrome & Firefox
      darkMediaQuery.addEventListener('change', ({ matches }) => {
        if (matches) {
          setActualTheme('dark');
        } else {
          setActualTheme('light');
        }
      });
    } catch (error) {
      // Safari < 14
      darkMediaQuery.addListener(({ matches }) => {
        try {
          if (matches) {
            setActualTheme('dark');
          } else {
            setActualTheme('light');
          }
        } catch (e) {
          console.error(e);
        }
      });
    }
  }, [theme]);

  React.useEffect(() => {
    // Ensure expanded is always false when no toasts are present / only one left
    if (toasts.length <= 1) {
      setExpanded(false);
    }
  }, [toasts]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isHotkeyPressed = hotkey.every((key) => (event as any)[key] || event.code === key);

      if (isHotkeyPressed) {
        setExpanded(true);
        listRef.current?.focus();
      }

      if (
        event.code === 'Escape' &&
        (document.activeElement === listRef.current || listRef.current?.contains(document.activeElement))
      ) {
        setExpanded(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [hotkey]);

  React.useEffect(() => {
    if (listRef.current) {
      return () => {
        if (lastFocusedElementRef.current) {
          lastFocusedElementRef.current.focus({ preventScroll: true });
          lastFocusedElementRef.current = null;
          isFocusWithinRef.current = false;
        }
      };
    }
  }, [listRef.current]);

  return (
    // Remove item from normal navigation flow, only available via hotkey
    <section
      ref={ref}
      aria-label={`${containerAriaLabel} ${hotkeyLabel}`}
      tabIndex={-1}
      aria-live="polite"
      aria-relevant="additions text"
      aria-atomic="false"
      suppressHydrationWarning
    >
      {possiblePositions.map((position, index) => {
        const [y, x] = position.split('-');

        if (!toasts.length) return null;

        return (
          <ol
            key={position}
            dir={dir === 'auto' ? getDocumentDirection() : dir}
            tabIndex={-1}
            ref={listRef}
            className={className}
            data-sonner-toaster
            data-sonner-theme={actualTheme}
            data-y-position={y}
            data-x-position={x}
            data-expanded={expanded || expand}
            data-theme={actualTheme}
            data-rich-colors={richColors}
            style={
              {
                '--front-toast-height': expanded || expand ? 'auto' : `${heights[0]?.height || 0}px`,
                '--width': `${TOAST_WIDTH}px`,
                '--gap': `${gap}px`,
                ...style,
                ...assignOffset(offset, mobileOffset),
              } as React.CSSProperties
            }
            onBlur={(event) => {
              if (isFocusWithinRef.current && !event.currentTarget.contains(event.relatedTarget)) {
                isFocusWithinRef.current = false;
                if (lastFocusedElementRef.current) {
                  lastFocusedElementRef.current.focus({ preventScroll: true });
                  lastFocusedElementRef.current = null;
                }
              }
            }}
            onFocus={(event) => {
              if (!isFocusWithinRef.current) {
                isFocusWithinRef.current = true;
                lastFocusedElementRef.current = event.relatedTarget as HTMLElement;
              }
            }}
            onMouseEnter={() => setExpanded(true)}
            onMouseMove={() => setExpanded(true)}
            onMouseLeave={() => {
              // Avoid setting expanded to false when interacting with a toast, e.g. swiping
              if (!interacting) {
                setExpanded(false);
              }
            }}
            onDragEnd={() => setExpanded(false)}
            onPointerDown={() => setInteracting(true)}
            onPointerUp={() => setInteracting(false)}
          >
            {toasts
              .filter((toast) => (!toast.position && index === 0) || toast.position === position)
              .map((toast, index) => (
                <Toast
                  key={toast.id}
                  icons={icons}
                  index={index}
                  toast={toast}
                  defaultRichColors={richColors}
                  className={toastOptions?.className}
                  descriptionClassName={toastOptions?.descriptionClassName}
                  invert={invert}
                  visibleToasts={visibleToasts}
                  interacting={interacting}
                  position={position}
                  style={toastOptions?.style}
                  unstyled={toastOptions?.unstyled}
                  classNames={toastOptions?.classNames}
                  cancelButtonStyle={toastOptions?.cancelButtonStyle}
                  actionButtonStyle={toastOptions?.actionButtonStyle}
                  toasts={toasts.filter((t) => t.position == toast.position)}
                  heights={heights.filter((h) => h.position == toast.position)}
                  setHeights={setHeights}
                  expandByDefault={expand}
                  gap={gap}
                  expanded={expanded}
                />
              ))}
          </ol>
        );
      })}
    </section>
  );
});

export { toast, Toaster, type ExternalToast, type ToastT, type ToasterProps, useSonner };
export { type ToastClassnames, type ToastToDismiss, type Action } from './types';
