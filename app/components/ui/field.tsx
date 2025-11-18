import { forwardRef } from 'react';
import { classNames } from '~/utils/classNames';

export interface FieldGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

const FieldGroup = forwardRef<HTMLDivElement, FieldGroupProps>(({ className, ...props }, ref) => {
  return <div ref={ref} className={classNames('flex flex-col gap-4', className)} {...props} />;
});
FieldGroup.displayName = 'FieldGroup';

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {}

const Field = forwardRef<HTMLDivElement, FieldProps>(({ className, ...props }, ref) => {
  return <div ref={ref} className={classNames('flex flex-col gap-2', className)} {...props} />;
});
Field.displayName = 'Field';

export interface FieldLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

const FieldLabel = forwardRef<HTMLLabelElement, FieldLabelProps>(({ className, ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={classNames('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', className)}
      {...props}
    />
  );
});
FieldLabel.displayName = 'FieldLabel';

export interface FieldDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const FieldDescription = forwardRef<HTMLParagraphElement, FieldDescriptionProps>(({ className, ...props }, ref) => {
  return (
    <p ref={ref} className={classNames('text-sm text-rax-elements-textSecondary', className)} {...props} />
  );
});
FieldDescription.displayName = 'FieldDescription';

export interface FieldSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

const FieldSeparator = forwardRef<HTMLDivElement, FieldSeparatorProps>(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={classNames('flex items-center gap-4', className)} {...props}>
      <div className="h-px flex-1 bg-rax-elements-borderColor" />
      {children && (
        <span className="text-xs text-rax-elements-textSecondary" data-slot="field-separator-content">
          {children}
        </span>
      )}
      <div className="h-px flex-1 bg-rax-elements-borderColor" />
    </div>
  );
});
FieldSeparator.displayName = 'FieldSeparator';

export { FieldGroup, Field, FieldLabel, FieldDescription, FieldSeparator };


