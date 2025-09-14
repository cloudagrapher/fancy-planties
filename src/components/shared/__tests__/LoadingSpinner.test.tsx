import { renderWithProviders } from "@/test-utils";
import { screen } from "@testing-library/react";
import LoadingSpinner, { InlineLoadingSpinner } from "../LoadingSpinner";

describe("LoadingSpinner Component", () => {
  const defaultLoadingState = {
    isLoading: true,
    operation: "Loading data",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Functionality", () => {
    it("renders loading spinner when loading is true", () => {
      renderWithProviders(<LoadingSpinner loading={defaultLoadingState} />);

      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByLabelText("Loading data")).toBeInTheDocument();
    });

    it("does not render when loading is false", () => {
      renderWithProviders(<LoadingSpinner loading={{ isLoading: false }} />);

      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("renders operation text when provided", () => {
      renderWithProviders(<LoadingSpinner loading={defaultLoadingState} />);

      expect(
        screen.getByText("Loading data", {
          selector: 'span[aria-live="polite"]',
        })
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Loading data")).toBeInTheDocument();
    });

    it("renders default loading text when no operation provided", () => {
      renderWithProviders(<LoadingSpinner loading={{ isLoading: true }} />);

      expect(
        screen.getByText("Loading content, please wait...")
      ).toBeInTheDocument();
    });
  });

  describe("Size Variants", () => {
    it("applies small size classes", () => {
      renderWithProviders(
        <LoadingSpinner loading={defaultLoadingState} size="sm" />
      );

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveClass("h-4", "w-4");

      const container = spinner.closest("div")?.parentElement;
      expect(container).toHaveClass("p-2");
    });

    it("applies medium size classes by default", () => {
      renderWithProviders(<LoadingSpinner loading={defaultLoadingState} />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveClass("h-6", "w-6");

      const container = spinner.closest("div")?.parentElement;
      expect(container).toHaveClass("p-4");
    });

    it("applies large size classes", () => {
      renderWithProviders(
        <LoadingSpinner loading={defaultLoadingState} size="lg" />
      );

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveClass("h-8", "w-8");

      const container = spinner.closest("div")?.parentElement;
      expect(container).toHaveClass("p-6");
    });
  });

  describe("Progress Display", () => {
    it("shows progress percentage when enabled and progress provided", () => {
      renderWithProviders(
        <LoadingSpinner
          loading={{ ...defaultLoadingState, progress: 75 }}
          showProgress={true}
        />
      );

      expect(screen.getByText("75%")).toBeInTheDocument();
    });

    it("shows progress bar when enabled and progress provided", () => {
      renderWithProviders(
        <LoadingSpinner
          loading={{ ...defaultLoadingState, progress: 60 }}
          showProgress={true}
        />
      );

      const progressBar = document.querySelector(".bg-primary-600");
      expect(progressBar).toHaveStyle("width: 60%");
    });

    it("does not show progress when showProgress is false", () => {
      renderWithProviders(
        <LoadingSpinner
          loading={{ ...defaultLoadingState, progress: 50 }}
          showProgress={false}
        />
      );

      expect(screen.queryByText("50%")).not.toBeInTheDocument();
    });

    it("does not show progress when progress is undefined", () => {
      renderWithProviders(
        <LoadingSpinner loading={defaultLoadingState} showProgress={true} />
      );

      expect(screen.queryByText("%")).not.toBeInTheDocument();
    });

    it("rounds progress percentage to nearest integer", () => {
      renderWithProviders(
        <LoadingSpinner
          loading={{ ...defaultLoadingState, progress: 33.7 }}
          showProgress={true}
        />
      );

      expect(screen.getByText("34%")).toBeInTheDocument();
    });
  });

  describe("Custom Styling", () => {
    it("applies custom className", () => {
      renderWithProviders(
        <LoadingSpinner
          loading={defaultLoadingState}
          className="custom-spinner"
        />
      );

      const container = screen
        .getByRole("status")
        .closest("div")?.parentElement;
      expect(container).toHaveClass("custom-spinner");
    });

    it("combines custom className with default classes", () => {
      renderWithProviders(
        <LoadingSpinner
          loading={defaultLoadingState}
          className="custom-class"
          size="lg"
        />
      );

      const container = screen
        .getByRole("status")
        .closest("div")?.parentElement;
      expect(container).toHaveClass("custom-class", "p-6");
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA attributes", () => {
      renderWithProviders(<LoadingSpinner loading={defaultLoadingState} />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveAttribute("aria-label", "Loading data");
    });

    it("has screen reader text", () => {
      renderWithProviders(<LoadingSpinner loading={defaultLoadingState} />);

      expect(
        screen.getByText("Loading data", { selector: ".sr-only" })
      ).toBeInTheDocument();
    });

    it("has live region for operation text", () => {
      renderWithProviders(<LoadingSpinner loading={defaultLoadingState} />);

      const liveRegion = screen.getByText("Loading data", {
        selector: 'span[aria-live="polite"]',
      });
      expect(liveRegion).toHaveAttribute("aria-live", "polite");
    });

    it("uses default screen reader text when no operation provided", () => {
      renderWithProviders(<LoadingSpinner loading={{ isLoading: true }} />);

      expect(
        screen.getByText("Loading content, please wait...", {
          selector: ".sr-only",
        })
      ).toBeInTheDocument();
    });
  });

  describe("Animation", () => {
    it("applies spin animation class", () => {
      renderWithProviders(<LoadingSpinner loading={defaultLoadingState} />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveClass("animate-spin");
    });

    it("applies primary color classes", () => {
      renderWithProviders(<LoadingSpinner loading={defaultLoadingState} />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveClass("text-primary-600");
    });
  });
});

describe("InlineLoadingSpinner Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Functionality", () => {
    it("renders inline spinner", () => {
      renderWithProviders(<InlineLoadingSpinner />);

      const spinner = screen.getByRole("status", { hidden: true });
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute("aria-hidden", "true");
    });

    it("applies default small size", () => {
      renderWithProviders(<InlineLoadingSpinner />);

      const spinner = screen.getByRole("status", { hidden: true });
      expect(spinner).toHaveClass("h-4", "w-4");
    });

    it("applies small size", () => {
      renderWithProviders(<InlineLoadingSpinner size="sm" />);

      const spinner = screen.getByRole("status", { hidden: true });
      expect(spinner).toHaveClass("h-4", "w-4");
    });

    it("applies large size", () => {
      renderWithProviders(<InlineLoadingSpinner size="lg" />);

      const spinner = screen.getByRole("status", { hidden: true });
      expect(spinner).toHaveClass("h-6", "w-6");
    });

    it("applies custom className", () => {
      renderWithProviders(<InlineLoadingSpinner className="text-white" />);

      const spinner = screen.getByRole("status", { hidden: true });
      expect(spinner).toHaveClass("text-white");
    });

    it("combines custom className with size classes", () => {
      renderWithProviders(
        <InlineLoadingSpinner size="lg" className="text-red-500" />
      );

      const spinner = screen.getByRole("status", { hidden: true });
      expect(spinner).toHaveClass("h-6", "w-6", "text-red-500");
    });
  });

  describe("Accessibility", () => {
    it("is hidden from screen readers", () => {
      renderWithProviders(<InlineLoadingSpinner />);

      const spinner = screen.getByRole("status", { hidden: true });
      expect(spinner).toHaveAttribute("aria-hidden", "true");
    });

    it("has status role", () => {
      renderWithProviders(<InlineLoadingSpinner />);

      expect(screen.getByRole("status", { hidden: true })).toBeInTheDocument();
    });
  });

  describe("Animation", () => {
    it("applies spin animation", () => {
      renderWithProviders(<InlineLoadingSpinner />);

      const spinner = screen.getByRole("status", { hidden: true });
      expect(spinner).toHaveClass("animate-spin");
    });
  });

  describe("Usage in Buttons", () => {
    it("works correctly inside button elements", () => {
      renderWithProviders(
        <button disabled>
          <InlineLoadingSpinner size="sm" className="mr-2" />
          Loading...
        </button>
      );

      const button = screen.getByRole("button");
      const spinner = screen.getByRole("status", { hidden: true });

      expect(button).toContainElement(spinner);
      expect(spinner).toHaveClass("h-4", "w-4", "mr-2");
      expect(button).toHaveTextContent("Loading...");
    });

    it("maintains proper spacing in button layouts", () => {
      renderWithProviders(
        <div className="flex items-center">
          <InlineLoadingSpinner size="sm" />
          <span className="ml-2">Processing</span>
        </div>
      );

      const spinner = screen.getByRole("status", { hidden: true });
      const text = screen.getByText("Processing");

      expect(spinner).toBeInTheDocument();
      expect(text).toBeInTheDocument();
      expect(text).toHaveClass("ml-2");
    });
  });
});
