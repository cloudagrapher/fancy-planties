import { renderWithProviders } from "@/test-utils";
import { screen } from "@testing-library/react";
import ErrorDisplay, { ErrorToast, InlineErrorDisplay } from "../ErrorDisplay";

describe("ErrorDisplay Component", () => {
  const defaultError = {
    message: "Something went wrong",
    retryable: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Functionality", () => {
    it("renders error message", () => {
      renderWithProviders(<ErrorDisplay error={defaultError} />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Error")).toBeInTheDocument();
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("does not render when error is null", () => {
      renderWithProviders(<ErrorDisplay error={null} />);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("does not render when error is undefined", () => {
      renderWithProviders(<ErrorDisplay error={undefined} />);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("Retry Functionality", () => {
    it("shows retry button when error is retryable and onRetry provided", () => {
      const onRetry = jest.fn();
      renderWithProviders(
        <ErrorDisplay error={defaultError} onRetry={onRetry} />
      );

      expect(
        screen.getByRole("button", { name: /try again/i })
      ).toBeInTheDocument();
    });

    it("does not show retry button when error is not retryable", () => {
      const onRetry = jest.fn();
      renderWithProviders(
        <ErrorDisplay
          error={{ ...defaultError, retryable: false }}
          onRetry={onRetry}
        />
      );

      expect(
        screen.queryByRole("button", { name: /try again/i })
      ).not.toBeInTheDocument();
    });

    it("does not show retry button when onRetry is not provided", () => {
      renderWithProviders(<ErrorDisplay error={defaultError} />);

      expect(
        screen.queryByRole("button", { name: /try again/i })
      ).not.toBeInTheDocument();
    });

    it("calls onRetry when retry button is clicked", async () => {
      const onRetry = jest.fn();
      const { user } = renderWithProviders(
        <ErrorDisplay error={defaultError} onRetry={onRetry} />
      );

      const retryButton = screen.getByRole("button", { name: /try again/i });
      await user.click(retryButton);

      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error Details", () => {
    const errorWithDetails = {
      message: "API Error",
      retryable: false,
      details: {
        status: 500,
        endpoint: "/api/plants",
        timestamp: "2024-01-01T00:00:00Z",
      },
    };

    it("shows details when showDetails is true", () => {
      renderWithProviders(
        <ErrorDisplay error={errorWithDetails} showDetails={true} />
      );

      expect(screen.getByText("Show technical details")).toBeInTheDocument();
    });

    it("does not show details when showDetails is false", () => {
      renderWithProviders(
        <ErrorDisplay error={errorWithDetails} showDetails={false} />
      );

      expect(
        screen.queryByText("Show technical details")
      ).not.toBeInTheDocument();
    });

    it("expands details when clicked", async () => {
      const { user } = renderWithProviders(
        <ErrorDisplay error={errorWithDetails} showDetails={true} />
      );

      const detailsToggle = screen.getByText("Show technical details");
      await user.click(detailsToggle);

      expect(screen.getByText(/"status": 500/)).toBeInTheDocument();
      expect(
        screen.getByText(/"endpoint": "\/api\/plants"/)
      ).toBeInTheDocument();
    });

    it("does not show details section when no details provided", () => {
      renderWithProviders(
        <ErrorDisplay error={defaultError} showDetails={true} />
      );

      expect(
        screen.queryByText("Show technical details")
      ).not.toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("applies custom className", () => {
      renderWithProviders(
        <ErrorDisplay error={defaultError} className="custom-error" />
      );

      const errorContainer = document.querySelector(".custom-error");
      expect(errorContainer).toBeInTheDocument();
    });

    it("applies default error styling", () => {
      renderWithProviders(<ErrorDisplay error={defaultError} />);

      const errorContainer = document.querySelector(".border-red-200");
      expect(errorContainer).toBeInTheDocument();
      expect(errorContainer).toHaveClass("bg-red-50");
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA attributes", () => {
      renderWithProviders(<ErrorDisplay error={defaultError} />);

      const errorMessage = screen.getByText("Something went wrong");
      expect(errorMessage).toHaveAttribute("role", "alert");
      expect(errorMessage).toHaveAttribute("aria-live", "polite");
    });

    it("has proper button accessibility", () => {
      const onRetry = jest.fn();
      renderWithProviders(
        <ErrorDisplay error={defaultError} onRetry={onRetry} />
      );

      const retryButton = screen.getByRole("button", { name: /try again/i });
      expect(retryButton).toHaveAttribute("type", "button");
    });

    it("has proper focus management", async () => {
      const onRetry = jest.fn();
      const { user } = renderWithProviders(
        <ErrorDisplay error={defaultError} onRetry={onRetry} />
      );

      const retryButton = screen.getByRole("button", { name: /try again/i });
      await user.tab();

      expect(retryButton).toHaveFocus();
    });
  });

  describe("Icon Display", () => {
    it("displays warning icon", () => {
      renderWithProviders(<ErrorDisplay error={defaultError} />);

      // Check for AlertTriangle icon (Lucide icon)
      const icon = document.querySelector("svg");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass("h-5", "w-5", "text-red-400");
    });

    it("displays refresh icon in retry button", () => {
      const onRetry = jest.fn();
      renderWithProviders(
        <ErrorDisplay error={defaultError} onRetry={onRetry} />
      );

      // Check for RefreshCw icon in button
      const retryButton = screen.getByRole("button", { name: /try again/i });
      const refreshIcon = retryButton.querySelector("svg");
      expect(refreshIcon).toBeInTheDocument();
      expect(refreshIcon).toHaveClass("h-3", "w-3");
    });
  });
});

describe("InlineErrorDisplay Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Functionality", () => {
    it("renders error message", () => {
      renderWithProviders(<InlineErrorDisplay error="Field is required" />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Field is required")).toBeInTheDocument();
    });

    it("does not render when error is null", () => {
      renderWithProviders(<InlineErrorDisplay error={null} />);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("does not render when error is empty string", () => {
      renderWithProviders(<InlineErrorDisplay error="" />);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("applies default inline error styling", () => {
      renderWithProviders(<InlineErrorDisplay error="Validation error" />);

      const errorContainer = screen.getByRole("alert");
      expect(errorContainer).toHaveClass("text-red-600", "text-sm");
    });

    it("applies custom className", () => {
      renderWithProviders(
        <InlineErrorDisplay error="Error message" className="custom-inline" />
      );

      const errorContainer = screen.getByRole("alert");
      expect(errorContainer).toHaveClass("custom-inline");
    });
  });

  describe("Icon Display", () => {
    it("displays X icon", () => {
      renderWithProviders(<InlineErrorDisplay error="Error message" />);

      // Check for X icon (Lucide icon)
      const errorContainer = screen.getByRole("alert");
      const icon = errorContainer.querySelector("svg");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass("h-4", "w-4");
    });

    it("icon has proper accessibility attributes", () => {
      renderWithProviders(<InlineErrorDisplay error="Error message" />);

      const errorContainer = screen.getByRole("alert");
      const icon = errorContainer.querySelector("svg");
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("Form Integration", () => {
    it("works correctly in form context", () => {
      renderWithProviders(
        <form>
          <input type="email" />
          <InlineErrorDisplay error="Invalid email format" />
        </form>
      );

      const input = screen.getByRole("textbox");
      const error = screen.getByRole("alert");

      expect(input).toBeInTheDocument();
      expect(error).toBeInTheDocument();
      expect(error).toHaveTextContent("Invalid email format");
    });
  });
});

describe("ErrorToast Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Functionality", () => {
    it("renders toast with error message", () => {
      const onDismiss = jest.fn();
      renderWithProviders(
        <ErrorToast error="Network error occurred" onDismiss={onDismiss} />
      );

      expect(screen.getByText("Error")).toBeInTheDocument();
      expect(screen.getByText("Network error occurred")).toBeInTheDocument();
    });

    it("renders dismiss button", () => {
      const onDismiss = jest.fn();
      renderWithProviders(
        <ErrorToast error="Error message" onDismiss={onDismiss} />
      );

      expect(
        screen.getByRole("button", { name: /dismiss/i })
      ).toBeInTheDocument();
    });

    it("calls onDismiss when dismiss button is clicked", async () => {
      const onDismiss = jest.fn();
      const { user } = renderWithProviders(
        <ErrorToast error="Error message" onDismiss={onDismiss} />
      );

      const dismissButton = screen.getByRole("button", { name: /dismiss/i });
      await user.click(dismissButton);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe("Positioning", () => {
    it("applies fixed positioning classes", () => {
      const onDismiss = jest.fn();
      renderWithProviders(
        <ErrorToast error="Error message" onDismiss={onDismiss} />
      );

      const toast = screen.getByText("Error").closest("div")
        ?.parentElement?.parentElement;
      expect(toast).toHaveClass("fixed", "top-4", "right-4", "z-50");
    });

    it("applies custom className", () => {
      const onDismiss = jest.fn();
      renderWithProviders(
        <ErrorToast
          error="Error message"
          onDismiss={onDismiss}
          className="custom-toast"
        />
      );

      const toast = screen.getByText("Error").closest("div")
        ?.parentElement?.parentElement;
      expect(toast).toHaveClass("custom-toast");
    });
  });

  describe("Styling", () => {
    it("applies toast styling", () => {
      const onDismiss = jest.fn();
      renderWithProviders(
        <ErrorToast error="Error message" onDismiss={onDismiss} />
      );

      const toast = screen.getByText("Error").closest("div")
        ?.parentElement?.parentElement;
      expect(toast).toHaveClass(
        "bg-red-50",
        "border-red-200",
        "rounded-lg",
        "shadow-lg"
      );
    });
  });

  describe("Icon Display", () => {
    it("displays alert triangle icon", () => {
      const onDismiss = jest.fn();
      renderWithProviders(
        <ErrorToast error="Error message" onDismiss={onDismiss} />
      );

      // Check for AlertTriangle icon
      const icons = document.querySelectorAll("svg");
      const alertIcon = Array.from(icons).find((icon) =>
        icon.classList.contains("text-red-400")
      );
      expect(alertIcon).toBeInTheDocument();
    });

    it("displays X icon in dismiss button", () => {
      const onDismiss = jest.fn();
      renderWithProviders(
        <ErrorToast error="Error message" onDismiss={onDismiss} />
      );

      // Check for X icon in dismiss button
      const dismissButton = screen.getByRole("button", { name: /dismiss/i });
      const icon = dismissButton.querySelector("svg");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass("h-5", "w-5");
    });
  });

  describe("Accessibility", () => {
    it("has proper button accessibility", () => {
      const onDismiss = jest.fn();
      renderWithProviders(
        <ErrorToast error="Error message" onDismiss={onDismiss} />
      );

      const dismissButton = screen.getByRole("button", { name: /dismiss/i });
      expect(dismissButton).toHaveAttribute("type", "button");
    });

    it("has proper focus management", async () => {
      const onDismiss = jest.fn();
      const { user } = renderWithProviders(
        <ErrorToast error="Error message" onDismiss={onDismiss} />
      );

      const dismissButton = screen.getByRole("button", { name: /dismiss/i });
      await user.tab();

      expect(dismissButton).toHaveFocus();
    });

    it("has screen reader text for dismiss button", () => {
      const onDismiss = jest.fn();
      renderWithProviders(
        <ErrorToast error="Error message" onDismiss={onDismiss} />
      );

      expect(
        screen.getByText("Dismiss", { selector: ".sr-only" })
      ).toBeInTheDocument();
    });
  });

  describe("Layout", () => {
    it("has proper layout structure", () => {
      const onDismiss = jest.fn();
      renderWithProviders(
        <ErrorToast error="Test error message" onDismiss={onDismiss} />
      );

      // Check that all elements are present and properly structured
      expect(screen.getByText("Error")).toBeInTheDocument();
      expect(screen.getByText("Test error message")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /dismiss/i })
      ).toBeInTheDocument();

      // Check layout classes
      const container = screen.getByText("Error").closest("div")?.parentElement;
      expect(container).toHaveClass("flex", "items-start");
    });
  });
});
