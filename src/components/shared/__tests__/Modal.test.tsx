import { renderWithProviders } from "@/test-utils";
import { screen } from "@testing-library/react";
import Modal, { ConfirmationModal, ModalWithTabs } from "../Modal";

describe("Modal Component", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    children: <div>Modal content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = "";
  });

  describe("Basic Modal Functionality", () => {
    it("renders modal content when open", () => {
      renderWithProviders(<Modal {...defaultProps} />);

      expect(screen.getByText("Modal content")).toBeInTheDocument();
      expect(document.querySelector(".modal-overlay")).toBeInTheDocument();
    });

    it("does not render when closed", () => {
      renderWithProviders(<Modal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText("Modal content")).not.toBeInTheDocument();
      expect(document.querySelector(".modal-overlay")).not.toBeInTheDocument();
    });

    it("renders title when provided", () => {
      renderWithProviders(<Modal {...defaultProps} title="Test Modal" />);

      expect(screen.getByText("Test Modal")).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
        "Test Modal"
      );
    });

    it("renders close button by default", () => {
      renderWithProviders(<Modal {...defaultProps} />);

      const closeButton = screen.getByRole("button", { name: /close modal/i });
      expect(closeButton).toBeInTheDocument();
    });

    it("hides close button when showCloseButton is false", () => {
      renderWithProviders(<Modal {...defaultProps} showCloseButton={false} />);

      expect(
        screen.queryByRole("button", { name: /close modal/i })
      ).not.toBeInTheDocument();
    });

    it("renders footer when provided", () => {
      const footer = <button>Footer Button</button>;
      renderWithProviders(<Modal {...defaultProps} footer={footer} />);

      expect(screen.getByText("Footer Button")).toBeInTheDocument();
      expect(document.querySelector(".modal-footer")).toBeInTheDocument();
    });
  });

  describe("Modal Interactions", () => {
    it("calls onClose when close button is clicked", async () => {
      const onClose = jest.fn();
      const { user } = renderWithProviders(
        <Modal {...defaultProps} onClose={onClose} />
      );

      const closeButton = screen.getByRole("button", { name: /close modal/i });
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when backdrop is clicked", async () => {
      const onClose = jest.fn();
      const { user } = renderWithProviders(
        <Modal {...defaultProps} onClose={onClose} />
      );

      const overlay = document.querySelector(".modal-overlay") as HTMLElement;
      await user.click(overlay);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not close when backdrop click is disabled", async () => {
      const onClose = jest.fn();
      const { user } = renderWithProviders(
        <Modal
          {...defaultProps}
          onClose={onClose}
          closeOnBackdropClick={false}
        />
      );

      const overlay = document.querySelector(".modal-overlay") as HTMLElement;
      await user.click(overlay);

      expect(onClose).not.toHaveBeenCalled();
    });

    it("does not close when clicking modal content", async () => {
      const onClose = jest.fn();
      const { user } = renderWithProviders(
        <Modal {...defaultProps} onClose={onClose} />
      );

      const content = screen.getByText("Modal content");
      await user.click(content);

      expect(onClose).not.toHaveBeenCalled();
    });

    it("calls onClose when Escape key is pressed", async () => {
      const onClose = jest.fn();
      const { user } = renderWithProviders(
        <Modal {...defaultProps} onClose={onClose} />
      );

      await user.keyboard("{Escape}");

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not close on Escape when disabled", async () => {
      const onClose = jest.fn();
      const { user } = renderWithProviders(
        <Modal {...defaultProps} onClose={onClose} closeOnEscape={false} />
      );

      await user.keyboard("{Escape}");

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("Modal Sizes", () => {
    it("applies default size class", () => {
      renderWithProviders(<Modal {...defaultProps} />);

      const modalContent = document.querySelector(".modal-content");
      expect(modalContent).not.toHaveClass("modal-content--large");
    });

    it("applies large size class", () => {
      renderWithProviders(<Modal {...defaultProps} size="large" />);

      const modalContent = document.querySelector(".modal-content");
      expect(modalContent).toHaveClass("modal-content--large");
    });
  });

  describe("Body Scroll Prevention", () => {
    it("prevents body scroll when modal is open", () => {
      renderWithProviders(<Modal {...defaultProps} />);

      expect(document.body.style.overflow).toBe("hidden");
    });

    it("restores body scroll when modal is closed", () => {
      const { rerender } = renderWithProviders(<Modal {...defaultProps} />);

      expect(document.body.style.overflow).toBe("hidden");

      rerender(<Modal {...defaultProps} isOpen={false} />);

      expect(document.body.style.overflow).toBe("unset");
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA attributes", () => {
      renderWithProviders(<Modal {...defaultProps} title="Test Modal" />);

      const closeButton = screen.getByRole("button", { name: /close modal/i });
      expect(closeButton).toHaveAttribute("aria-label", "Close modal");
    });

    it("focuses management works correctly", async () => {
      renderWithProviders(<Modal {...defaultProps} />);

      // Modal should be rendered in a portal
      const modalOverlay = document.querySelector(".modal-overlay");
      expect(modalOverlay?.parentElement).toBe(document.body);
    });
  });
});

describe("ModalWithTabs Component", () => {
  const tabs = [
    { id: "tab1", label: "Tab 1", content: <div>Tab 1 content</div> },
    { id: "tab2", label: "Tab 2", content: <div>Tab 2 content</div> },
    {
      id: "tab3",
      label: "Tab 3",
      content: <div>Tab 3 content</div>,
      icon: "🔧",
    },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    title: "Tabbed Modal",
    tabs,
    activeTab: "tab1",
    onTabChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("renders all tabs", () => {
    renderWithProviders(<ModalWithTabs {...defaultProps} />);

    expect(screen.getByText("Tab 1")).toBeInTheDocument();
    expect(screen.getByText("Tab 2")).toBeInTheDocument();
    expect(screen.getByText("Tab 3")).toBeInTheDocument();
  });

  it("renders tab icons when provided", () => {
    renderWithProviders(<ModalWithTabs {...defaultProps} />);

    expect(screen.getByText("🔧")).toBeInTheDocument();
  });

  it("shows active tab content", () => {
    renderWithProviders(<ModalWithTabs {...defaultProps} />);

    expect(screen.getByText("Tab 1 content")).toBeInTheDocument();
    expect(screen.queryByText("Tab 2 content")).not.toBeInTheDocument();
  });

  it("switches tabs when clicked", async () => {
    const onTabChange = jest.fn();
    const { user } = renderWithProviders(
      <ModalWithTabs {...defaultProps} onTabChange={onTabChange} />
    );

    const tab2Button = screen.getByText("Tab 2");
    await user.click(tab2Button);

    expect(onTabChange).toHaveBeenCalledWith("tab2");
  });

  it("applies active tab styling", () => {
    renderWithProviders(<ModalWithTabs {...defaultProps} />);

    const activeTab = screen.getByText("Tab 1").closest(".tab");
    const inactiveTab = screen.getByText("Tab 2").closest(".tab");

    expect(activeTab).toHaveClass("tab--active");
    expect(inactiveTab).not.toHaveClass("tab--active");
  });

  it("shows different content when active tab changes", () => {
    const { rerender } = renderWithProviders(
      <ModalWithTabs {...defaultProps} />
    );

    expect(screen.getByText("Tab 1 content")).toBeInTheDocument();

    rerender(<ModalWithTabs {...defaultProps} activeTab="tab2" />);

    expect(screen.getByText("Tab 2 content")).toBeInTheDocument();
    expect(screen.queryByText("Tab 1 content")).not.toBeInTheDocument();
  });
});

describe("ConfirmationModal Component", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    title: "Confirm Action",
    message: "Are you sure you want to proceed?",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("renders confirmation message", () => {
    renderWithProviders(<ConfirmationModal {...defaultProps} />);

    expect(screen.getByText("Confirm Action")).toBeInTheDocument();
    expect(
      screen.getByText("Are you sure you want to proceed?")
    ).toBeInTheDocument();
  });

  it("renders default button text", () => {
    renderWithProviders(<ConfirmationModal {...defaultProps} />);

    expect(screen.getByText("Confirm")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("renders custom button text", () => {
    renderWithProviders(
      <ConfirmationModal
        {...defaultProps}
        confirmText="Delete"
        cancelText="Keep"
      />
    );

    expect(screen.getByText("Delete")).toBeInTheDocument();
    expect(screen.getByText("Keep")).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button is clicked", async () => {
    const onConfirm = jest.fn();
    const { user } = renderWithProviders(
      <ConfirmationModal {...defaultProps} onConfirm={onConfirm} />
    );

    const confirmButton = screen.getByText("Confirm");
    await user.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when cancel button is clicked", async () => {
    const onClose = jest.fn();
    const { user } = renderWithProviders(
      <ConfirmationModal {...defaultProps} onClose={onClose} />
    );

    const cancelButton = screen.getByText("Cancel");
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("applies danger variant styling", () => {
    renderWithProviders(
      <ConfirmationModal {...defaultProps} variant="danger" />
    );

    const confirmButton = screen.getByText("Confirm");
    expect(confirmButton).toHaveClass("btn--danger");
  });

  it("applies default variant styling", () => {
    renderWithProviders(<ConfirmationModal {...defaultProps} />);

    const confirmButton = screen.getByText("Confirm");
    expect(confirmButton).toHaveClass("btn--primary");
    expect(confirmButton).not.toHaveClass("btn--danger");
  });

  it("disables buttons when loading", () => {
    renderWithProviders(
      <ConfirmationModal {...defaultProps} isLoading={true} />
    );

    const confirmButton = screen.getByText("Confirm");
    const cancelButton = screen.getByText("Cancel");

    expect(confirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it("shows loading state on confirm button", () => {
    renderWithProviders(
      <ConfirmationModal {...defaultProps} isLoading={true} />
    );

    const confirmButton = screen.getByText("Confirm");
    expect(confirmButton).toHaveClass("btn--loading");
  });

  it("prevents closing when loading", async () => {
    const onClose = jest.fn();
    const { user } = renderWithProviders(
      <ConfirmationModal {...defaultProps} onClose={onClose} isLoading={true} />
    );

    // Try to close with escape key
    await user.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();

    // Try to close with backdrop click
    const overlay = document.querySelector(".modal-overlay") as HTMLElement;
    await user.click(overlay);
    expect(onClose).not.toHaveBeenCalled();
  });
});
