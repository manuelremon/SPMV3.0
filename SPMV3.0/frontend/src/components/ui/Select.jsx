import React from "react";
import PropTypes from "prop-types";
import MuiSelect from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import FormHelperText from "@mui/material/FormHelperText";

/**
 * Select Component - MUI Outlined Style
 * Wrapper around MUI Select with outlined variant
 *
 * @param {string} label - Label for the select
 * @param {string} value - Selected value
 * @param {function} onChange - Change handler
 * @param {array} options - Array of options: [{value, label}] or [{value, label, disabled}]
 * @param {boolean} error - Error state
 * @param {string} helperText - Helper text below select
 * @param {boolean} disabled - Disabled state
 * @param {boolean} fullWidth - Full width (default: true)
 * @param {string} size - Size: 'small' | 'medium'
 * @param {string} placeholder - Placeholder text
 * @param {node} children - Alternative to options prop (MenuItem children)
 */
export const Select = React.forwardRef(({
  label,
  value,
  onChange,
  options = [],
  error = false,
  helperText,
  disabled = false,
  fullWidth = true,
  size = "medium",
  placeholder,
  children,
  className = "",
  id,
  name,
  required = false,
  ...props
}, ref) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  const labelId = `${selectId}-label`;

  return (
    <FormControl
      fullWidth={fullWidth}
      error={error}
      disabled={disabled}
      size={size}
      className={className}
    >
      {label && (
        <InputLabel id={labelId} required={required}>
          {label}
        </InputLabel>
      )}
      <MuiSelect
        ref={ref}
        labelId={label ? labelId : undefined}
        id={selectId}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        label={label}
        displayEmpty={!!placeholder}
        variant="outlined"
        {...props}
      >
        {placeholder && (
          <MenuItem value="" disabled>
            <em>{placeholder}</em>
          </MenuItem>
        )}
        {/* Render children if provided, otherwise render options */}
        {children || options.map((option) => (
          <MenuItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </MenuItem>
        ))}
      </MuiSelect>
      {helperText && (
        <FormHelperText>{helperText}</FormHelperText>
      )}
    </FormControl>
  );
});

Select.displayName = "Select";

Select.propTypes = {
  label: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired,
      disabled: PropTypes.bool,
    })
  ),
  error: PropTypes.bool,
  helperText: PropTypes.string,
  disabled: PropTypes.bool,
  fullWidth: PropTypes.bool,
  size: PropTypes.oneOf(["small", "medium"]),
  placeholder: PropTypes.string,
  children: PropTypes.node,
  className: PropTypes.string,
  id: PropTypes.string,
  name: PropTypes.string,
  required: PropTypes.bool,
};

Select.defaultProps = {
  options: [],
  error: false,
  disabled: false,
  fullWidth: true,
  size: "medium",
  className: "",
  required: false,
};

export default Select;
