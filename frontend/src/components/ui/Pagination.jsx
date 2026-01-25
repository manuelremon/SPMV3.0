import React from "react";
import PropTypes from "prop-types";
import clsx from "clsx";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Button } from "./Button";
import { ChevronLeft, ChevronRight } from "./Icons";

/**
 * Pagination Component - Glass Morphism Style + Responsive
 * Translucent pagination with subtle glass effect
 * En móvil: layout vertical con botones full width
 */
export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  labels = {},
  className = "",
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const {
    page = "Página",
    of = "de",
    showing = "Mostrando",
    prev = "Anterior",
    next = "Siguiente",
  } = labels;

  // Calcular items mostrados
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalPages <= 1) return null;

  return (
    <div className={clsx(
      "pt-4",
      "border-t border-white/30 dark:border-white/10",
      // Layout responsive: vertical en móvil, horizontal en desktop
      isMobile ? "flex flex-col gap-3" : "flex items-center justify-between",
      className
    )}>
      {/* Info de página */}
      <div className={clsx(
        "text-sm text-slate-500 dark:text-slate-400",
        isMobile && "text-center"
      )}>
        {page} {currentPage} {of} {totalPages}
        {!isMobile && (
          <span className="ml-2">
            ({showing} {startItem}-{endItem} {of} {totalItems})
          </span>
        )}
      </div>

      {/* Botones de navegación */}
      <div className={clsx(
        "flex gap-2",
        isMobile && "w-full"
      )}>
        <Button
          variant="secondary"
          size="md"
          className={clsx(
            "flex items-center justify-center gap-1",
            isMobile && "flex-1"
          )}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="w-4 h-4" />
          {prev}
        </Button>
        <Button
          variant="secondary"
          size="md"
          className={clsx(
            "flex items-center justify-center gap-1",
            isMobile && "flex-1"
          )}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          {next}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Info adicional en móvil (debajo de botones) */}
      {isMobile && (
        <div className="text-xs text-slate-400 text-center">
          {showing} {startItem}-{endItem} {of} {totalItems}
        </div>
      )}
    </div>
  );
}

Pagination.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  totalItems: PropTypes.number.isRequired,
  itemsPerPage: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  labels: PropTypes.shape({
    page: PropTypes.string,
    of: PropTypes.string,
    showing: PropTypes.string,
    prev: PropTypes.string,
    next: PropTypes.string,
  }),
  className: PropTypes.string,
};

Pagination.defaultProps = {
  labels: {},
  className: "",
};

export default Pagination;
