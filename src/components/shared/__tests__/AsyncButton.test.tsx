import { renderWithProviders } from "@/test-utils/helpers/render-helpers";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AsyncButton, {
  DeleteButton,
  RetryButton,
  SaveButton,
  SubmitButton,
} from "../AsyncButton";

describe("AsyncButton", () => {
  const defaultProps = {
    children: "Click me",
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Functionality", () => {
    it("renders button with children", () => {
      renderWithProviders(<AsyncButton {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /click me/i })
      ).toBeInTheDocument();
    });

    it("calls onClick when clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<AsyncButton {...defaultProps} />);

      await user.click(screen.getByRole("button"));

      expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
    });

    it("applies custom className", () => {
      renderWithProviders(
        <AsyncButton {...defaultProps} className="custom-class" />
      );

      const button = screen.getByRole("button");
      expect(button).toHaveClass("custom-class");
    });

    it("forwards ref correctly", () => {
      const ref = jest.fn();
      renderWithProviders(<AsyncButton {...defaultProps} ref={ref} />);

      expect(ref).toHaveBeenCalledWith(expect.any(HTMLButtonElement));
    });
  });

  describe("Loading State", () => {
    it("shows loading spinner when isLoading is true", () => {
      renderWithProviders(<AsyncButton {...defaultProps} isLoading={true} />);

      expect(screen.getByRole("status", { hidden: true })).toBeInTheDocument();
    });

    it("shows loading text when provided", () => {
      renderWithProviders(
        <AsyncButton
          {...defaultProps}
          isLoading={true}
          loadingText="Processing..."
        />
      );

      // Check for the visible loading text (not the screen reader text)
      const visibleText = screen.getAllByText("Processing...")[0];
      expect(visibleText).toBeInTheDocument();
    });

    it("shows children when not loading", () => {
      renderWithProviders(<AsyncButton {...defaultProps} isLoading={false} />);

      expect(screen.getByText("Click me")).toBeInTheDocument();
      expect(
        screen.queryByRole("status", { hidden: true })
      ).not.toBeInTheDocument();
    });

    it("disables button when loading", () => {
      renderWithProviders(<AsyncButton {...defaultProps} isLoading={true} />);

      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("does not call onClick when loading and clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<AsyncButton {...defaultProps} isLoading={true} />);

      await user.click(screen.getByRole("button"));

      expect(defaultProps.onClick).not.toHaveBeenCalled();
    });
  });

  describe("Button Variants", () => {
    it("applies primary variant by default", () => {
      renderWithProviders(<AsyncButton {...defaultProps} />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("btn--primary");
    });

    it("applies secondary variant", () => {
      renderWithProviders(
        <AsyncButton {...defaultProps} variant="secondary" />
      );

      const button = screen.getByRole("button");
      expect(button).toHaveClass("btn--secondary");
    });

    it("applies outline variant", () => {
      renderWithProviders(<AsyncButton {...defaultProps} variant="outline" />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("btn--outline");
    });

    it("applies danger variant", () => {
      renderWithProviders(<AsyncButton {...defaultProps} variant="danger" />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("btn--danger");
    });
  });

  describe("Button Sizes", () => {
    it("applies medium size by default", () => {
      renderWithProviders(<AsyncButton {...defaultProps} />);

      const button = screen.getByRole("button");
      // Medium size doesn't add a specific class, just base classes
      expect(button).toHaveClass("btn", "btn--primary");
      expect(button).not.toHaveClass("btn--sm", "btn--lg");
    });

    it("applies small size", () => {
      renderWithProviders(<AsyncButton {...defaultProps} size="sm" />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("btn--sm");
    });

    it("applies large size", () => {
      renderWithProviders(<AsyncButton {...defaultProps} size="lg" />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("btn--lg");
    });
  });

  describe("Disabled State", () => {
    it("disables button when disabled prop is true", () => {
      renderWithProviders(<AsyncButton {...defaultProps} disabled={true} />);

      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("does not call onClick when disabled", async () => {
      const user = userEvent.setup();
      renderWithProviders(<AsyncButton {...defaultProps} disabled={true} />);

      await user.click(screen.getByRole("button"));

      expect(defaultProps.onClick).not.toHaveBeenCalled();
    });

    it("applies disabled styling", () => {
      renderWithProviders(<AsyncButton {...defaultProps} disabled={true} />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("opacity-50", "cursor-not-allowed");
    });
  });

  describe("HTML Attributes", () => {
    it("applies button type", () => {
      renderWithProviders(<AsyncButton {...defaultProps} type="submit" />);

      expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
    });

    it("applies aria-label", () => {
      renderWithProviders(
        <AsyncButton {...defaultProps} aria-label="Custom label" />
      );

      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-label",
        "Custom label"
      );
    });

    it("applies title attribute", () => {
      renderWithProviders(
        <AsyncButton {...defaultProps} title="Button tooltip" />
      );

      expect(screen.getByRole("button")).toHaveAttribute(
        "title",
        "Button tooltip"
      );
    });
  });

  describe("Accessibility", () => {
    it("has proper button role", () => {
      renderWithProviders(<AsyncButton {...defaultProps} />);

      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("is focusable when not disabled", async () => {
      const user = userEvent.setup();
      renderWithProviders(<AsyncButton {...defaultProps} />);

      await user.tab();

      expect(screen.getByRole("button")).toHaveFocus();
    });

    it("is not focusable when disabled", async () => {
      const user = userEvent.setup();
      renderWithProviders(<AsyncButton {...defaultProps} disabled={true} />);

      await user.tab();

      expect(screen.getByRole("button")).not.toHaveFocus();
    });

    it("announces loading state to screen readers", () => {
      renderWithProviders(<AsyncButton {...defaultProps} isLoading={true} />);

      const spinner = screen.getByRole("status", { hidden: true });
      expect(spinner).toHaveAttribute("aria-hidden", "true");
    });
  });
});

describe("SubmitButton", () => {
  const defaultProps = {
    children: "Submit",
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders as submit type", () => {
    renderWithProviders(<SubmitButton {...defaultProps} />);

    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("shows default loading text", () => {
    renderWithProviders(<SubmitButton {...defaultProps} isLoading={true} />);

    const visibleText = screen.getAllByText("Submitting...")[0];
    expect(visibleText).toBeInTheDocument();
  });

  it("shows custom loading text", () => {
    renderWithProviders(
      <SubmitButton
        {...defaultProps}
        isLoading={true}
        loadingText="Processing form..."
      />
    );

    const visibleText = screen.getAllByText("Processing form...")[0];
    expect(visibleText).toBeInTheDocument();
  });

  it("applies primary variant by default", () => {
    renderWithProviders(<SubmitButton {...defaultProps} />);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("btn--primary");
  });
});

describe("SaveButton", () => {
  const defaultProps = {
    children: "Save",
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders as button type", () => {
    renderWithProviders(<SaveButton {...defaultProps} />);

    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("shows default loading text", () => {
    renderWithProviders(<SaveButton {...defaultProps} isLoading={true} />);

    const visibleText = screen.getAllByText("Saving...")[0];
    expect(visibleText).toBeInTheDocument();
  });

  it("shows custom loading text", () => {
    renderWithProviders(
      <SaveButton
        {...defaultProps}
        isLoading={true}
        loadingText="Saving changes..."
      />
    );

    const visibleText = screen.getAllByText("Saving changes...")[0];
    expect(visibleText).toBeInTheDocument();
  });

  it("applies primary variant by default", () => {
    renderWithProviders(<SaveButton {...defaultProps} />);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("btn--primary");
  });
});

describe("DeleteButton", () => {
  const defaultProps = {
    children: "Delete",
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows default loading text", () => {
    renderWithProviders(<DeleteButton {...defaultProps} isLoading={true} />);

    const visibleText = screen.getAllByText("Deleting...")[0];
    expect(visibleText).toBeInTheDocument();
  });

  it("shows custom loading text", () => {
    renderWithProviders(
      <DeleteButton
        {...defaultProps}
        isLoading={true}
        loadingText="Removing item..."
      />
    );

    const visibleText = screen.getAllByText("Removing item...")[0];
    expect(visibleText).toBeInTheDocument();
  });

  it("applies danger variant by default", () => {
    renderWithProviders(<DeleteButton {...defaultProps} />);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("btn--danger");
  });
});

describe("RetryButton", () => {
  const defaultProps = {
    children: "Retry",
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows default loading text", () => {
    renderWithProviders(<RetryButton {...defaultProps} isLoading={true} />);

    const visibleText = screen.getAllByText("Retrying...")[0];
    expect(visibleText).toBeInTheDocument();
  });

  it("shows custom loading text", () => {
    renderWithProviders(
      <RetryButton
        {...defaultProps}
        isLoading={true}
        loadingText="Attempting again..."
      />
    );

    const visibleText = screen.getAllByText("Attempting again...")[0];
    expect(visibleText).toBeInTheDocument();
  });

  it("applies outline variant by default", () => {
    renderWithProviders(<RetryButton {...defaultProps} />);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("btn--outline");
  });

  it("includes retry icon", () => {
    renderWithProviders(<RetryButton {...defaultProps} />);

    // Check for the RefreshCw icon
    const button = screen.getByRole("button");
    const icon = button.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });
});
